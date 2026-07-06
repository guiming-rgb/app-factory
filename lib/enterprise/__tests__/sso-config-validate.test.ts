import { describe, it, expect } from "vitest";
import { validateConfigureSSOInput } from "@/lib/enterprise/sso-config-validate";

describe("SSO config JSON schema validation", () => {
  it("合法 OIDC 配置应通过", () => {
    const result = validateConfigureSSOInput({
      provider: "oidc",
      metadataUrl: "https://idp.example.com/.well-known/openid-configuration",
      domain: "acme.example.com",
      clientId: "client-1",
    });
    expect(result.ok).toBe(true);
  });

  it("非法 provider 应拒绝", () => {
    const result = validateConfigureSSOInput({
      provider: "ldap",
      metadataUrl: "https://idp.example.com",
      domain: "acme.example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it("非 URL metadataUrl 应拒绝", () => {
    const result = validateConfigureSSOInput({
      provider: "saml",
      metadataUrl: "not-a-url",
      domain: "acme.example.com",
    });
    expect(result.ok).toBe(false);
  });
});
