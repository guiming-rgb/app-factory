import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * A-1: Markdown 报告 → PDF 导出
 * 将 8 Agent 报告渲染为 HTML 后转 PDF（简洁方案：HTML→PDF via API）
 */

function mdToHtml(markdown: string, title: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#222;line-height:1.8}
h1{font-size:28px;border-bottom:3px solid #7c3aed;padding-bottom:12px}
h2{font-size:20px;color:#7c3aed;margin-top:32px}
h3{font-size:16px;margin-top:24px}
li{margin:4px 0}
.cover{text-align:center;padding:60px 0;border-bottom:1px solid #ddd;margin-bottom:40px}
.cover h1{font-size:36px;border:none}
.cover p{font-size:16px;color:#666}
.footer{text-align:center;font-size:11px;color:#999;margin-top:60px;border-top:1px solid #eee;padding-top:20px}
</style></head>
<body>
<div class="cover"><h1>${title}</h1><p>App 生产工厂 · 9 Agent 协同报告</p><p style="font-size:14px">${new Date().toLocaleDateString("zh-CN")}</p></div>
<p>${escaped}</p>
<div class="footer"><p>由 App 生产工厂自动生成</p></div>
</body></html>`;
}

export async function generateReportPdf(projectId: string): Promise<{ html: string; pdfBase64?: string }> {
  const { data: project } = await getSupabaseAdmin()
    .from("projects")
    .select("title, final_report")
    .eq("id", projectId)
    .maybeSingle();

  if (!project?.final_report) throw new Error("项目报告不存在");

  const title = (project as Record<string, string>).title ?? "项目报告";
  const html = mdToHtml((project as Record<string, string>).final_report, title);

  return { html };
}
