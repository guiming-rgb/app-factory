/** GitHub 仓库名 sanitize（小写、合法字符、长度上限） */
export function sanitizeRepoName(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || "app-factory-generated";
}

export function deriveCodegenRepoName(input: {
  fileName?: string;
  displayName?: string;
  target: string;
  projectTitle?: string;
}): string {
  const fromFile = input.fileName
    ?.replace(/\.zip$/i, "")
    .replace(/-(flutter|wechat|harmony)$/i, "");
  const base =
    fromFile || input.displayName || input.projectTitle || "app-factory";
  const slug = sanitizeRepoName(base).slice(0, 80);
  const suffix =
    input.target === "wechat"
      ? "-wechat"
      : input.target === "harmony"
        ? "-harmony"
        : "-flutter";
  return `${slug}${suffix}`;
}
