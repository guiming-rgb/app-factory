/**
 * v2a 增强：从方案报告抽取 App Spec
 * npm run extract:spec -- <projectId>
 * npm run extract:spec -- --report /path/to/report.md --title "少儿足球"
 */
import "../lib/load-env-local";
import fs from "fs/promises";
import path from "path";

import { buildSpecForProject, extractSpecFromReport } from "../lib/app-spec/from-report";
import { getSupabaseAdmin } from "../lib/supabase";

async function main() {
  const argv = process.argv.slice(2);
  let projectId: string | undefined;
  let reportPath: string | undefined;
  let title = "未命名应用";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--report" && argv[i + 1]) reportPath = argv[++i];
    else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
    else if (!argv[i].startsWith("-")) projectId = argv[i];
  }

  console.log("══ 报告 → App Spec ══\n");

  if (reportPath) {
    const report = await fs.readFile(path.resolve(reportPath), "utf8");
    const id = projectId ?? "00000000-0000-4000-8000-000000000001";
    const result = await extractSpecFromReport({
      id,
      title,
      idea: null,
      final_report: report
    });
    console.log(`source: ${result.source}`);
    console.log(JSON.stringify(result.spec, null, 2));
    return;
  }

  if (!projectId) {
    console.error("用法: npm run extract:spec -- <projectId>");
    console.error("  或: npm run extract:spec -- --report report.md --title 标题");
    process.exit(1);
  }

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id, title, idea, final_report, status")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    console.error("项目不存在:", projectId);
    process.exit(1);
  }

  console.log(`项目: ${project.title} (${project.status})`);
  console.log(
    `报告长度: ${(project.final_report ?? "").length} 字符\n`
  );

  const result = await buildSpecForProject({
    id: project.id,
    title: project.title ?? title,
    idea: project.idea,
    final_report: project.final_report
  });

  if (result.warning) console.warn(`⚠️  ${result.warning}\n`);
  console.log(`source: ${result.source}`);
  console.log(JSON.stringify(result.spec, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
