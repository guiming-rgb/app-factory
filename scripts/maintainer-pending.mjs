/**
 * 维护者待办状态
 * npm run maintainer:pending
 * npm run maintainer:done -- M-S6-01 "备注"
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const statePath = path.join(root, "docs/maintainer-pending-state.json");

function loadState() {
  if (!fs.existsSync(statePath)) {
    console.error("❌ 缺少", statePath);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function saveState(state) {
  state.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function listPending(state, { humanOnly = false } = {}) {
  const items = state.items.filter((i) => {
    if (i.status === "done") return false;
    if (humanOnly && !i.mustHuman) return false;
    return true;
  });
  return items;
}

export function formatReminderMessage(state) {
  const human = listPending(state, { humanOnly: true });
  const all = listPending(state);
  const lines = [
    "【App 生产工厂】维护者待办",
    `必须您亲自完成：${human.length} 项 · 全部待办：${all.length} 项`,
    ""
  ];
  for (const item of human.slice(0, 8)) {
    lines.push(`• ${item.id} ${item.title}`);
  }
  if (human.length > 8) {
    lines.push(`… 另有 ${human.length - 8} 项`);
  }
  lines.push("");
  lines.push("详情：npm run maintainer:pending");
  return lines.join("\n");
}

function cmdList() {
  const state = loadState();
  const human = listPending(state, { humanOnly: true });
  const optional = listPending(state).filter((i) => !i.mustHuman);

  console.log("══ 维护者待办 ══\n");
  console.log(`更新日期：${state.updatedAt}`);
  console.log(`必须您跑：${human.length} 项 · 可选/可 Agent：${optional.length} 项\n`);

  if (human.length === 0) {
    console.log("✅ 无待办（必须人工项已全部完成）\n");
  } else {
    console.log("── 必须您亲自跑 ──\n");
    for (const item of human) {
      console.log(`[ ] ${item.id}  ${item.title}`);
      console.log(`    原因：${item.why}`);
      console.log(`    验收：${item.verify}`);
      console.log(`    通过：${item.passHint}`);
      if (item.steps?.length) {
        console.log(`    步骤：`);
        for (const s of item.steps) {
          console.log(`      - ${s}`);
        }
      }
      console.log("");
    }
  }

  if (optional.length > 0) {
    console.log("── 可选 / 可交给 Agent ──\n");
    for (const item of optional) {
      console.log(`[ ] ${item.id}  ${item.title}  (${item.verify})`);
    }
    console.log("");
  }

  const done = state.items.filter((i) => i.status === "done");
  if (done.length > 0) {
    console.log(`── 已完成 ${done.length} 项 ──\n`);
    for (const item of done) {
      console.log(`[x] ${item.id}  ${item.doneAt ?? "—"}  ${item.evidence || item.title}`);
    }
  }

  console.log("\n完成某项：npm run maintainer:done -- <ID> \"备注\"");
}

function cmdDone(id, note) {
  if (!id) {
    console.error("用法: npm run maintainer:done -- M-S6-01 \"verify 通过\"");
    process.exit(1);
  }
  const state = loadState();
  const item = state.items.find((i) => i.id === id);
  if (!item) {
    console.error(`❌ 未知 ID: ${id}`);
    process.exit(1);
  }
  item.status = "done";
  item.doneAt = new Date().toISOString();
  item.evidence = note || item.evidence || "已确认";
  saveState(state);
  console.log(`✅ 已标记完成：${id}`);
  console.log(`   ${item.title}`);
  if (note) console.log(`   备注：${note}`);
  const left = listPending(state, { humanOnly: true }).length;
  console.log(`\n剩余必须人工项：${left}`);
}

function main() {
  const [cmd, id, ...rest] = process.argv.slice(2);
  const note = rest.join(" ").trim();

  if (!cmd || cmd === "list" || cmd === "pending") {
    cmdList();
    return;
  }
  if (cmd === "done") {
    cmdDone(id, note);
    return;
  }
  if (cmd === "message") {
    const state = loadState();
    console.log(formatReminderMessage(state));
    return;
  }

  console.error("用法: pending | done <ID> [备注] | message");
  process.exit(1);
}

main();
