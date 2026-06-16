import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/generated-privacy
 * 根据 AppSpec.complianceFlags 生成可下载的隐私政策文档
 * Body: { appName, displayName, complianceFlags }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "缺少请求体" }, { status: 400 });
    }

    const appName = (body.appName as string) ?? "未命名应用";
    const displayName = (body.displayName as string) ?? appName;
    const flags = (body.complianceFlags as Record<string, unknown>) ?? {};
    const format = (req.nextUrl.searchParams.get("format") ?? "html") as "html" | "md";

    const generatedAt = new Date().toISOString().slice(0, 10);
    const industry = flags.regulatedIndustry as string | undefined;
    const hasHIPAA = flags.requiresHIPAA === true;
    const hasPCIDSS = flags.requiresPCIDSS === true;
    const hasGDPR = flags.requiresGDPR === true;
    const hasPIPL = flags.requiresPIPL === true;
    const hasKYC = flags.requiresKYC === true;
    const hasAudit = flags.requiresAuditLog === true;
    const hasDataDel = flags.requiresDataDeletionAPI === true;
    const hasDataLocal = flags.requiresDataLocalization === true;
    const checklist = Array.isArray(flags.checklist) ? flags.checklist as string[] : [];

    // 根据行业生成特定合规条款
    const industryClauses: string[] = [];
    if (industry === "medical" || hasHIPAA) {
      industryClauses.push("根据 HIPAA（健康保险流通与责任法案），健康数据属于受保护的健康信息（PHI），我们承诺：仅用于个人健康管理目的；不会在未经明确授权的情况下与第三方共享；数据存储采用加密措施；您有权获取您的健康数据副本。");
    }
    if (industry === "fintech" || industry === "insurance" || hasPCIDSS) {
      industryClauses.push("根据 PCI-DSS（支付卡行业数据安全标准），支付信息在传输和存储过程中采用加密保护。本应用不存储完整的支付卡号，支付处理通过 Stripe 等合规支付服务商完成。");
    }
    if (hasKYC) {
      industryClauses.push("身份验证信息（KYC）按照反洗钱（AML）法规要求进行收集和存储。身份信息仅用于合规身份核验，并在法律法规要求的期限内保留。");
    }
    if (hasGDPR) {
      industryClauses.push("根据 GDPR（欧盟通用数据保护条例），您享有以下权利：被告知权（第13-14条）、访问权（第15条）、更正权（第16条）、删除权/被遗忘权（第17条）、限制处理权（第18条）、数据可携带权（第20条）。");
    }
    if (hasPIPL) {
      industryClauses.push("根据《中华人民共和国个人信息保护法》，我们遵循最小必要原则收集个人信息，明确告知处理目的和方式，在您同意的前提下进行数据处理。");
    }
    if (hasDataLocal) {
      industryClauses.push("根据数据本地化要求，您的数据存储在中国境内的服务器上。如需跨境数据传输，我们将按照相关法律法规进行安全评估。");
    }

    if (industryClauses.length === 0) {
      industryClauses.push("本应用遵循标准的数据保护实践，确保您的个人信息安全。");
    }

    const privacyClauses = [
      "账号信息：邮箱地址（用于注册和登录）",
      "使用数据：应用使用情况、功能交互记录（用于优化服务）",
      "设备信息：设备型号、操作系统版本（用于兼容性适配）",
      ...(hasAudit ? ["操作日志：关键操作记录（用于安全审计）"] : []),
      ...(hasDataDel ? ["数据删除：您可通过应用内功能或联系我们删除全部数据"] : []),
    ];

    if (format === "md") {
      const md = `# ${displayName} 隐私政策

生成日期：${generatedAt}
生成平台：App 生产工厂

## 1. 信息收集

${displayName} 可能收集以下类型的信息：

${privacyClauses.map((c) => `- ${c}`).join("\n")}

## 2. 行业特定合规

${industryClauses.join("\n\n")}

## 3. 数据使用与共享

您的数据仅用于提供应用核心功能和改进服务质量。我们不会将您的个人信息出售给第三方。
${hasAudit ? "\n所有关键操作均记录审计日志，用于安全监控和合规审查。" : ""}

## 4. 数据存储与安全

数据存储在 Supabase PostgreSQL 数据库中，采用行级安全（RLS）策略进行隔离保护。
传输过程全程 HTTPS 加密。${hasDataLocal ? "\n数据存储在中国境内的服务器上。" : ""}

## 5. 您的权利

- 访问和查看您的数据
- 更正不准确的信息
- 申请删除您的数据
- 撤回对数据处理的同意
- 导出您的数据副本

## 6. 联系我们

如有隐私相关问题，请联系：support@app-factory.dev

---

*本隐私政策由 App 生产工厂根据应用合规要求自动生成。*
${checklist.length > 0 ? `\n\n## 合规检查清单\n\n${checklist.map((c) => `- [ ] ${c}`).join("\n")}` : ""}
`;
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${appName}-privacy-policy.md"`,
        },
      });
    }

    // HTML 格式
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${displayName} 隐私政策</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.8; font-size: 15px; }
  h1 { font-size: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 12px; }
  h2 { font-size: 18px; margin-top: 28px; color: #0d9488; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999; }
  .checklist { margin-top: 24px; }
  .checklist li { list-style: none; }
</style>
</head>
<body>
<h1>${displayName} 隐私政策</h1>
<p class="meta">生成日期：${generatedAt} · 由 App 生产工厂自动生成</p>

<h2>1. 信息收集</h2>
<p>${displayName} 可能收集以下类型的信息：</p>
<ul>${privacyClauses.map((c) => `<li>${c}</li>`).join("\n")}</ul>

<h2>2. 行业特定合规</h2>
${industryClauses.map((c) => `<p>${c}</p>`).join("")}

<h2>3. 数据使用与共享</h2>
<p>您的数据仅用于提供应用核心功能和改进服务质量。我们不会将您的个人信息出售给第三方。${hasAudit ? "所有关键操作均记录审计日志，用于安全监控和合规审查。" : ""}</p>

<h2>4. 数据存储与安全</h2>
<p>数据存储在 Supabase PostgreSQL 数据库中，采用行级安全（RLS）策略进行隔离保护。传输过程全程 HTTPS 加密。${hasDataLocal ? "数据存储在中国境内的服务器上。" : ""}</p>

<h2>5. 您的权利</h2>
<ul>
  <li>访问和查看您的数据</li>
  <li>更正不准确的信息</li>
  <li>申请删除您的数据</li>
  <li>撤回对数据处理的同意</li>
  <li>导出您的数据副本</li>
</ul>

<h2>6. 联系我们</h2>
<p>如有隐私相关问题，请联系：<strong>support@app-factory.dev</strong></p>

${checklist.length > 0 ? `<h2>合规检查清单</h2><ul class="checklist">${checklist.map((c) => `<li>☐ ${c}</li>`).join("\n")}</ul>` : ""}

<div class="footer">
  <p>本隐私政策由 App 生产工厂根据应用合规要求自动生成。</p>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${appName}-privacy-policy.html"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成失败" },
      { status: 500 }
    );
  }
}

/**
 * GET — 返回使用说明
 */
export async function GET() {
  return NextResponse.json({
    usage: "POST /api/generated-privacy?format=html|md",
    body: "{ appName, displayName, complianceFlags }",
    description: "根据 AppSpec.complianceFlags 生成可下载的隐私政策文档",
  });
}
