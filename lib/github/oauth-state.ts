import crypto from "crypto";

import { getGitHubOAuthStateSecret } from "./config";

type OAuthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
  next?: string;
};

function encodePayload(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as OAuthStatePayload;
    if (!parsed?.userId || !parsed?.nonce || !parsed?.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createGitHubOAuthState(input: {
  userId: string;
  next?: string;
}): string {
  const payload: OAuthStatePayload = {
    userId: input.userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
    next: input.next?.startsWith("/") ? input.next : undefined
  };
  const body = encodePayload(payload);
  const sig = crypto
    .createHmac("sha256", getGitHubOAuthStateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGitHubOAuthState(state: string): OAuthStatePayload | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", getGitHubOAuthStateSecret())
    .update(body)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }
  const payload = decodePayload(body);
  if (!payload || payload.exp < Date.now()) {
    return null;
  }
  return payload;
}
