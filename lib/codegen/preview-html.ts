import type { AppSpec } from "@/lib/app-spec/types";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mockDataForEntity(entityName: string): Array<{ id: string; title: string; subtitle: string }> {
  const items: Record<string, Array<{ id: string; title: string; subtitle: string }>> = {
    match: [{ id: "1", title: "决赛 — 红队 vs 蓝队", subtitle: "2024-06-15 · 比分 3:2" }, { id: "2", title: "半决赛 — 绿队 vs 黄队", subtitle: "2024-06-10 · 比分 2:1" }],
    product: [{ id: "1", title: "商品 A", subtitle: "¥29.90 · 库存 120" }, { id: "2", title: "商品 B", subtitle: "¥59.90 · 库存 45" }],
    task: [{ id: "1", title: "完成需求文档", subtitle: "优先级: 高 · 截止: 2024-06-20" }, { id: "2", title: "修复登录 Bug", subtitle: "优先级: 中 · 截止: 2024-06-18" }],
  };
  return items[entityName] ?? [{ id: "1", title: "示例项目 1", subtitle: "描述信息" }, { id: "2", title: "示例项目 2", subtitle: "点击查看详情" }];
}

/** P1: 交互式 Spec 预览 — 支持 Tab 切换、mock 数据、表单模拟 */
export function generateSpecPreviewHtml(spec: AppSpec): string {
  const tabs = resolveTabScreens(spec);
  const entities = (spec.entities ?? []) as Array<{ name: string; fields: Array<{ name: string; type: string }> }>;

  // Tab 按钮
  const tabButtons = tabs.map((s, i) =>
    `<button class="tab${i === 0 ? " active" : ""}" onclick="switchTab('${esc(s.id)}')">${esc(s.title)}</button>`
  ).join("");

  // Tab 面板
  const panels = tabs.map((s, i) => {
    const isList = s.type === "list";
    const isForm = s.type === "form";
    const isDetail = s.type === "detail";
    const entity = entities.find((e) => e.name === s.entity) ?? entities[0];
    const mockItems = entity ? mockDataForEntity(entity.name) : [];

    let body = "";
    if (isList && mockItems.length > 0) {
      body = mockItems.map((item) =>
        `<div class="card list-item" onclick="alert('详情: ${esc(item.title)}')">
          <div class="list-title">${esc(item.title)}</div>
          <div class="list-sub">${esc(item.subtitle)}</div>
        </div>`
      ).join("");
    } else if (isForm && entity) {
      body = entity.fields.filter((f) => f.name !== "id" || !(f as Record<string, unknown>).primary).map((f) =>
        `<div class="form-row"><label>${esc(f.name)}</label><input placeholder="请输入${esc(f.name)}" /></div>`
      ).join("") + '<button class="submit-btn" onclick="alert(\'提交成功！（演示）\')">提交</button>';
    } else if (isDetail && entity) {
      body = entity.fields.map((f) =>
        `<div class="detail-row"><span class="label">${esc(f.name)}</span><span class="value">${f.type === "uuid" ? "a1b2c3d4-..." : "示例数据"}</span></div>`
      ).join("");
    } else {
      body = `<div class="card"><p>${esc(s.title)} 页面</p><p class="meta">type: ${esc(s.type)} · id: ${esc(s.id)}</p></div>`;
    }

    return `<section class="panel${i === 0 ? " active" : ""}" id="panel-${esc(s.id)}">
      <h2>${esc(s.title)}</h2>${body}
    </section>`;
  }).join("");

  const entityInfo = entities.map((e) =>
    `<span class="tag">${esc(e.name)}: ${e.fields.map((f) => f.name).join(", ")}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(spec.displayName)} — 预览</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;color:#111}
.app-bar{background:#7c3aed;color:#fff;padding:16px 20px;position:sticky;top:0;z-index:10}
.app-bar h1{font-size:20px}
.app-bar .meta{font-size:12px;opacity:.8;margin-top:4px}
.tabs{display:flex;background:#fff;border-bottom:1px solid #e5e7eb;overflow-x:auto}
.tab{padding:12px 20px;border:none;background:0;font-size:14px;cursor:pointer;white-space:nowrap;color:#666;border-bottom:2px solid transparent}
.tab.active{color:#7c3aed;border-bottom-color:#7c3aed;font-weight:600}
.panel{display:none;padding:16px}
.panel.active{display:block}
.panel h2{font-size:18px;margin-bottom:12px}
.card{background:#fff;border-radius:12px;padding:16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.list-item{cursor:pointer;transition:transform .1s}
.list-item:active{transform:scale(.98)}
.list-title{font-size:15px;font-weight:600}
.list-sub{font-size:12px;color:#666;margin-top:4px}
.form-row{margin-bottom:12px}
.form-row label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px}
.form-row input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
.submit-btn{background:#7c3aed;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:15px;width:100%;cursor:pointer;margin-top:8px}
.detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}
.detail-row .label{color:#666;font-size:13px}
.detail-row .value{font-weight:500;font-size:14px}
.meta{font-size:12px;color:#999}
.tag{display:inline-block;background:#ede9fe;color:#7c3aed;padding:4px 10px;border-radius:12px;font-size:11px;margin:4px 4px 0 0}
footer{padding:20px;text-align:center;font-size:12px;color:#999}
</style>
</head>
<body>
<div class="app-bar"><h1>${esc(spec.displayName)}</h1><div class="meta">${entityInfo}</div></div>
<div class="tabs">${tabButtons}</div>
${panels}
<footer>App 生产工厂 · Spec v${esc(spec.specVersion)} · ${new Date().toLocaleDateString("zh-CN")}</footer>
<script>
function switchTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  document.querySelector('[data-tab="'+id+'"]')?.classList.add("active");
  document.getElementById("panel-"+id)?.classList.add("active");
}
</script>
</body>
</html>`;
}
