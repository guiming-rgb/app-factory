/**
 * 收尾 2: Slack / Discord 频道通知
 * 代码生成完成/失败时推送到团队频道
 */

type ChannelConfig = { webhookUrl: string };

async function sendSlack(webhook: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendDiscord(webhook: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return res.ok;
  } catch { return false; }
}

function getChannels(): ChannelConfig[] {
  const channels: ChannelConfig[] = [];
  if (process.env.SLACK_WEBHOOK_URL?.trim()) channels.push({ webhookUrl: process.env.SLACK_WEBHOOK_URL.trim() });
  if (process.env.DISCORD_WEBHOOK_URL?.trim()) channels.push({ webhookUrl: process.env.DISCORD_WEBHOOK_URL.trim() });
  return channels;
}

export async function notifyChannel(params: {
  projectTitle: string;
  targets: string[];
  status: "completed" | "failed";
  error?: string;
  downloadUrl?: string;
}): Promise<void> {
  const channels = getChannels();
  if (!channels.length) return;

  const icon = params.status === "completed" ? "✅" : "❌";
  const header = params.status === "completed"
    ? `代码生成完成 — ${params.projectTitle}`
    : `代码生成失败 — ${params.projectTitle}`;

  const body = [
    header,
    `平台: ${params.targets.join(", ")}`,
    params.downloadUrl ? `下载: ${params.downloadUrl}` : "",
    params.error ? `错误: ${params.error}` : "",
  ].filter(Boolean).join("\n");

  const firstChannel = channels[0];
  const isSlack = firstChannel.webhookUrl.includes("slack");

  const sent = isSlack
    ? await sendSlack(firstChannel.webhookUrl, body)
    : await sendDiscord(firstChannel.webhookUrl, body);

  if (!sent) console.warn("[notifyChannel] 发送失败");
}
