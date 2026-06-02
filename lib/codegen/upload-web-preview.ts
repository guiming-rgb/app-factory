import fs from "fs/promises";
import path from "path";

import { writeArtifactFile } from "@/lib/codegen/artifacts";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";
import { zipDirectory } from "@/lib/flutter-codegen/zip";

/**
 * P1: 将 Flutter Web 构建产物上传到 Supabase Storage
 * 返回公网可访问的 URL（通过 Supabase Storage API）
 */

/**
 * 上传 Flutter Web 构建产物并返回相对路径。
 * 上传为一个 ZIP 包（浏览器无法直接解压），同时上传各文件为独立 artifact。
 * 返回预览用的相对路径（在 run 的 artifact 目录下）。
 */
export async function uploadFlutterWebPreview(
  runId: string,
  webBuildDir: string
): Promise<string | null> {
  try {
    // 确保 index.html 存在
    const indexPath = path.join(webBuildDir, "index.html");
    try {
      await fs.access(indexPath);
    } catch {
      return null;
    }

    // 将 web build 目录打包上传
    const buffer = await zipDirectory(webBuildDir);
    const { relativePath } = await writeArtifactFile(
      runId,
      "flutter-web.zip",
      buffer
    );

    // 上传 web 构建产物的关键文件（index.html + main.dart.js）
    try {
      const files = await fs.readdir(webBuildDir);
      for (const file of files) {
        const fp = path.join(webBuildDir, file);
        const stat = await fs.stat(fp);
        if (stat.isFile()) {
          const content = await fs.readFile(fp);
          await writeArtifactFile(runId, `flutter-web/${file}`, content);
        }
      }
    } catch (e) {
      console.warn("[uploadFlutterWebPreview] individual files:", e);
    }

    // 也写一个可浏览的 HTML 说明（如果无法直接托管静态站）
    const bucket = getCodegenStorageBucket();
    const htmlNote = Buffer.from(
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Flutter Web 预览</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center; }
    a { color: #7c3aed; }
  </style>
</head>
<body>
  <h1>📱 Flutter Web 构建已完成</h1>
  <p>Web 产物已打包在 <code>flutter-web.zip</code> 中。</p>
  <p>本地运行：解压后执行 <code>cd build/web && python3 -m http.server 8000</code></p>
  <p>或部署到 Vercel/Netlify 静态托管。</p>
  <p><small>Bucket: ${bucket}</small></p>
</body>
</html>`,
      "utf8"
    );
    await writeArtifactFile(runId, "web-preview.html", htmlNote);

    return relativePath;
  } catch (err) {
    console.warn("[uploadFlutterWebPreview]", err);
    return null;
  }
}

/** P1: 部署 Flutter Web 到 Vercel 静态托管 */
export async function deployFlutterWebToVercel(
  webBuildDir: string,
  appName: string
): Promise<{ url: string } | { error: string }> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) return { error: "缺少 VERCEL_TOKEN 环境变量" };

  try {
    // Vercel API: 创建部署
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `app-factory-${appName}`,
        project: process.env.VERCEL_PROJECT_ID,
        target: "production",
        files: await collectFilesForVercel(webBuildDir),
      }),
    });

    if (!deployRes.ok) {
      const err = await deployRes.json().catch(() => ({}));
      return { error: (err as Record<string, unknown>).message as string || `Vercel API ${deployRes.status}` };
    }

    const deploy = (await deployRes.json()) as { url: string };
    return { url: `https://${deploy.url}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "部署失败" };
  }
}

/** 收集 Web 构建产物文件为 Vercel 格式 */
async function collectFilesForVercel(dir: string): Promise<Array<{ file: string; data: string; encoding: string }>> {
  const files: Array<{ file: string; data: string; encoding: string }> = [];

  async function walk(currentDir: string, prefix = "") {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        // 跳过不需要的目录
        if (entry.name === "assets" || entry.name === "icons" || entry.name === "flutter") {
          await walk(fullPath, relativePath);
        }
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath, "utf8");
        files.push({ file: relativePath, data: content, encoding: "utf-8" });
      }
    }
  }

  await walk(dir);
  return files;
}
