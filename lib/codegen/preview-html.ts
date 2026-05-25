import type { AppSpec } from "@/lib/app-spec/types";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 从 App Spec 生成静态 HTML 预览（v3 PoC，非 Flutter Web） */
export function generateSpecPreviewHtml(spec: AppSpec): string {
  const tabs = resolveTabScreens(spec);
  const tabItems = tabs
    .map(
      (s, i) =>
        `<button type="button" class="tab${i === 0 ? " active" : ""}" data-tab="${esc(s.id)}">${esc(s.title)}</button>`
    )
    .join("\n");

  const panels = tabs
    .map(
      (s, i) => `<section class="panel${i === 0 ? " active" : ""}" data-panel="${esc(s.id)}">
        <h2>${esc(s.title)}</h2>
        <p class="meta">screen · ${esc(s.type)} · id: ${esc(s.id)}</p>
        <div class="card">由 App 生产工厂根据方案生成的 ${esc(spec.displayName)} 界面占位预览。</div>
      </section>`
    )
    .join("\n");

  const limitations = (spec.limitations ?? [])
    .map((l) => `<li>${esc(l)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(spec.displayName)} · 预览</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #f3f4f6; }
    .phone { max-width: 390px; margin: 24px auto; background: #fff; border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.12); overflow: hidden; min-height: 640px; display: flex; flex-direction: column; }
    header { padding: 16px; background: #111827; color: #fff; }
    header h1 { margin: 0; font-size: 1.1rem; }
    header p { margin: 4px 0 0; font-size: 12px; opacity: .75; }
    main { flex: 1; padding: 16px; }
    .panel { display: none; }
    .panel.active { display: block; }
    .panel h2 { margin: 0 0 8px; font-size: 1rem; }
    .meta { font-size: 12px; color: #6b7280; margin: 0 0 12px; }
    .card { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px; padding: 24px; text-align: center; color: #374151; font-size: 14px; }
    nav { display: flex; border-top: 1px solid #e5e7eb; }
    .tab { flex: 1; border: 0; background: #fff; padding: 12px 8px; font-size: 12px; cursor: pointer; color: #6b7280; }
    .tab.active { color: #7c3aed; font-weight: 600; border-top: 2px solid #7c3aed; margin-top: -1px; }
    footer { padding: 12px 16px; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
    ul { margin: 8px 0 0; padding-left: 18px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="phone">
    <header>
      <h1>${esc(spec.displayName)}</h1>
      <p>App Spec 静态预览 · ${esc(spec.appName)}</p>
    </header>
    <main>
      ${panels}
    </main>
    <nav>${tabItems}</nav>
    <footer>
      App 生产工厂 v3 预览 PoC
      ${limitations ? `<ul>${limitations}</ul>` : ""}
    </footer>
  </div>
  <script>
    document.querySelectorAll(".tab").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab").forEach(function(b) { b.classList.remove("active"); });
        document.querySelectorAll(".panel").forEach(function(p) { p.classList.remove("active"); });
        btn.classList.add("active");
        var panel = document.querySelector('[data-panel="' + id + '"]');
        if (panel) panel.classList.add("active");
      });
    });
  </script>
</body>
</html>`;
}
