/**
 * 校验 billing 相关 redirect URL，仅允许同源或相对路径。
 */
export function validateBillingRedirectUrl(
  url: string | undefined,
  fieldName: string,
): { ok: true; url: string } | { ok: false; error: string } {
  if (!url || typeof url !== "string") {
    return { ok: false, error: `${fieldName} is required` };
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  try {
    const parsed = new URL(url, appBase);
    const appOrigin = new URL(appBase).origin;
    if (parsed.origin !== appOrigin) {
      return {
        ok: false,
        error: `${fieldName} must be on the same origin as the application`,
      };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    if (url.startsWith("/") && !url.startsWith("//")) {
      return { ok: true, url: new URL(url, appBase).toString() };
    }
    return { ok: false, error: `${fieldName} is not a valid URL` };
  }
}
