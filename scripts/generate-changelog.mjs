#!/usr/bin/env node
/**
 * P2-5: Changelog 自动生成（从 git log）
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";

const out = process.argv[2] || "CHANGELOG.md";

let log;
try { log = execSync('git log --oneline --no-merges --format="%s" -50', { encoding: "utf8" }); }
catch { log = "无 git 历史"; }

const lines = log.trim().split("\n").filter(Boolean);
const byCategory = { feat: [], fix: [], refactor: [], test: [], docs: [], chore: [] };

for (const line of lines) {
  const m = line.match(/^(feat|fix|refactor|test|docs|chore|perf|style)(\(.+?\))?:\s*(.+)/);
  if (m) byCategory[m[1]]?.push(m[3]);
  else byCategory.chore.push(line);
}

let md = `# Changelog\n\n> 自动生成于 ${new Date().toISOString().slice(0, 10)}\n\n`;

const sections = [
  ["Features", byCategory.feat],
  ["Bug Fixes", byCategory.fix],
  ["Refactoring", byCategory.refactor],
  ["Tests", byCategory.test],
  ["Documentation", byCategory.docs],
  ["Chores", byCategory.chore],
];

for (const [title, items] of sections) {
  if (items.length) {
    md += `## ${title}\n\n${items.map((i) => `- ${i}`).join("\n")}\n\n`;
  }
}

md += `---\n共 ${lines.length} 条提交记录\n`;
writeFileSync(out, md);
console.log(`✅ Changelog: ${out} (${lines.length} 条)`);
