/**
 * 方向 B-4：邮件通知（Resend / SendGrid 兼容）
 * 代码生成完成/失败时发送通知
 */

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

/** 通过 Resend API 发送邮件 */
async function sendViaResend(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "App 生产工厂 <notify@app-factory.dev>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 通过 SendGrid 发送邮件 */
async function sendViaSendGrid(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: "notify@app-factory.dev", name: "App 生产工厂" },
        subject: payload.subject,
        content: [{ type: "text/html", value: payload.html }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 发送代码生成完成通知 */
export async function notifyCodegenComplete(params: {
  email: string;
  projectTitle: string;
  targets: string[];
  downloadUrl?: string;
}): Promise<void> {
  const targetsText = params.targets.join("、");
  const html = `
    <h2>🎉 代码生成完成</h2>
    <p>项目 <strong>${params.projectTitle}</strong> 的代码已生成完毕。</p>
    <p>平台：${targetsText}</p>
    ${params.downloadUrl ? `<p><a href="${params.downloadUrl}">点击下载 ZIP</a></p>` : "<p>请登录 App 生产工厂查看和下载产物。</p>"}
    <hr><p style="color:#999;font-size:12px">App 生产工厂自动发送</p>
  `;

  const sent = (await sendViaResend({ to: params.email, subject: `代码生成完成 — ${params.projectTitle}`, html })) ||
    (await sendViaSendGrid({ to: params.email, subject: `代码生成完成 — ${params.projectTitle}`, html }));

  if (!sent) {
    console.warn("[notify] 邮件发送失败（未配置 Resend/SendGrid）");
  }
}

/** 发送代码生成失败通知 */
export async function notifyCodegenFailed(params: {
  email: string;
  projectTitle: string;
  target: string;
  error: string;
}): Promise<void> {
  const html = `
    <h2>⚠️ 代码生成失败</h2>
    <p>项目 <strong>${params.projectTitle}</strong> — ${params.target} 生成失败。</p>
    <p>错误：${params.error}</p>
    <p>请登录 App 生产工厂查看详情并重试。</p>
  `;

  await sendViaResend({ to: params.email, subject: `代码生成失败 — ${params.projectTitle}`, html }) ||
    sendViaSendGrid({ to: params.email, subject: `代码生成失败 — ${params.projectTitle}`, html });
}
