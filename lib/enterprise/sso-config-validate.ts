/**
 * P3: SSO 配置 JSON Schema 校验（config/enterprise/sso-config.schema.json）
 */
import type { ConfigureSSOInput } from "./sso-service";

export type SSOValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateConfigureSSOInput(
  input: unknown,
): SSOValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["body 须为 JSON 对象"] };
  }
  const body = input as Record<string, unknown>;

  const provider = body.provider;
  if (provider !== "saml" && provider !== "oidc") {
    errors.push("provider 须为 saml 或 oidc");
  }

  const metadataUrl = body.metadataUrl;
  if (typeof metadataUrl !== "string" || metadataUrl.length < 8) {
    errors.push("metadataUrl 须为有效 URL 字符串");
  } else if (!/^https?:\/\//i.test(metadataUrl)) {
    errors.push("metadataUrl 须以 http:// 或 https:// 开头");
  }

  const domain = body.domain;
  if (typeof domain !== "string" || domain.length < 3) {
    errors.push("domain 须为有效域名");
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
    errors.push("domain 格式无效");
  }

  if (body.clientId !== undefined && typeof body.clientId !== "string") {
    errors.push("clientId 须为字符串");
  }
  if (body.clientSecret !== undefined && typeof body.clientSecret !== "string") {
    errors.push("clientSecret 须为字符串");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function assertValidConfigureSSOInput(input: unknown): asserts input is ConfigureSSOInput {
  const result = validateConfigureSSOInput(input);
  if (!result.ok) {
    throw new Error(`SSO 配置校验失败：${result.errors.join("; ")}`);
  }
}
