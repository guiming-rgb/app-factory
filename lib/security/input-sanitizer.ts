/**
 * 输入清洗工具
 *
 * 在 Spec 生成管道中清洗用户输入，防止：
 * - XSS（跨站脚本）
 * - SQL 注入
 * - 提示注入（Prompt Injection）
 * - 控制字符/空字节攻击
 *
 * 所有导出函数均为纯函数，无副作用。
 */

// ── 常量 ──────────────────────────────────────────────

/** Spec 输入最大字节数 (100 KB) */
export const MAX_SPEC_INPUT_BYTES = 100 * 1024;

/** 通用危险字符映射 */
const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/** 检测提示注入的触发短语 */
const PROMPT_INJECTION_PATTERNS: { pattern: RegExp; risk: string }[] = [
  { pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|directions|commands)/i, risk: "忽略历史指令尝试" },
  { pattern: /(system\s+)?prompt(\s+below)?[:\s].*/i, risk: "系统提示词泄露尝试" },
  { pattern: /you\s+(are|were)\s+(now\s+)?(an?\s+)?(AI|assistant|bot|model|GPT)/i, risk: "角色扮演诱导尝试" },
  { pattern: /output\s+(only|just|solely)\s+(the\s+)?(json|code|number|text)/i, risk: "输出格式劫持尝试" },
  { pattern: /forget\s+(all\s+)?(previous|above)/i, risk: "记忆清除尝试" },
  { pattern: /do\s+(not\s+)?(follow|obey|listen)\s+(the\s+)?(above|previous)/i, risk: "指令覆盖尝试" },
  { pattern: /你(现在|接下来)?(是|扮演)/i, risk: "中文角色扮演尝试" },
  { pattern: /忽略(前面|以上|之前|所有).*(指令|要求|提示)/i, risk: "中文忽略指令尝试" },
  { pattern: /不要(遵守|遵循|按照|理会)(上面|以上|之前)/i, risk: "中文指令覆盖尝试" },
];

/** SQL 注释模式 */
const SQL_COMMENT_REGEX = /(--[^\n]*|\/\*[\s\S]*?\*\/)/g;

/** 控制字符（排除 \n, \r, \t） */
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** HTML/脚本标签 */
const HTML_TAG_REGEX = /<[^>]*>/g;

/** 脚本标签（包括带属性的） */
const SCRIPT_TAG_REGEX = /<script[\s>][\s\S]*?<\/script>/gi;

/** 空字节 */
const NULL_BYTE_REGEX = /\x00/g;

// ── 内部工具 ──────────────────────────────────────────

/** 将控制字符替换为安全标记 */
function replaceControlChar(c: string): string {
  const code = c.charCodeAt(0);
  return `[U+${code.toString(16).padStart(4, "0")}]`;
}

/** 安全的 HTML 实体编码 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ENTITY_MAP[ch] ?? ch);
}

// ── 导出函数 ──────────────────────────────────────────

/**
 * 清洗字符串：移除 HTML 标签、脚本标签、控制字符。
 * 适用于用户输入显示在 UI 前的清洗。
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  let result = input;

  // 移除 script 标签及其内容
  result = result.replace(SCRIPT_TAG_REGEX, "");

  // 移除所有 HTML 标签（保留标签内的文本）
  result = result.replace(HTML_TAG_REGEX, "");

  // 移除控制字符（保留 \n, \r, \t）
  result = result.replace(CONTROL_CHARS_REGEX, replaceControlChar);

  // 解码任何双重编码的 HTML 实体（最多三次防止递归）
  for (let i = 0; i < 3; i++) {
    const decoded = result
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"');
    if (decoded === result) break;
    result = decoded;
  }

  // HTML 实体编码
  result = escapeHtml(result);

  return result;
}

/**
 * 清洗 SQL 输入：转义单引号并移除 SQL 注释。
 * 适用于动态构建 SQL 查询时防止注入。
 * 注意：首选参数化查询，此函数仅作深度防护。
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== "string") return "";

  let result = input;

  // 移除 SQL 注释
  result = result.replace(SQL_COMMENT_REGEX, "");

  // 转义单引号（两个单引号是 SQL 标准转义）
  result = result.replace(/'/g, "''");

  // 移除空字节
  result = result.replace(NULL_BYTE_REGEX, "");

  // 移除控制字符（保留 \n, \r, \t）
  result = result.replace(CONTROL_CHARS_REGEX, "");

  return result;
}

/** 验证 email 格式 */
export function validateEmail(email: string): boolean {
  if (typeof email !== "string") return false;

  const trimmed = email.trim();

  // 长度限制
  if (trimmed.length < 3 || trimmed.length > 254) return false;

  // RFC 5322 简化版正则
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  return emailRegex.test(trimmed);
}

/** 验证 URL — 仅允许 http/https */
export function validateUrl(url: string): boolean {
  if (typeof url !== "string") return false;

  const trimmed = url.trim();

  if (trimmed.length === 0 || trimmed.length > 2048) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Spec 输入全面清洗管道。
 * 用于在 Spec 生成前处理用户输入的 app 描述/需求。
 */
export function sanitizeSpecInput(raw: string): string {
  if (typeof raw !== "string") return "";

  let result = raw;

  // 移除空字节
  result = result.replace(NULL_BYTE_REGEX, "");

  // 移除控制字符（保留 \n, \r, \t）
  result = result.replace(CONTROL_CHARS_REGEX, "");

  // 移除 script 标签及其内容
  result = result.replace(SCRIPT_TAG_REGEX, "");

  // 移除 HTML 标签
  result = result.replace(HTML_TAG_REGEX, "");

  // Unicode 规范化（NFC 形式）
  result = result.normalize("NFC");

  // 前后空白修剪
  result = result.trim();

  // 按字节长度截断（避免 UTF-8 多字节字符中间截断）
  const encoder = new TextEncoder();
  const encoded = encoder.encode(result);
  if (encoded.length > MAX_SPEC_INPUT_BYTES) {
    // 安全截断：以最大合法字节数为界，递减直到遇到有效 UTF-8 边界
    let truncated = new Uint8Array(encoded.buffer, 0, MAX_SPEC_INPUT_BYTES);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    result = decoder.decode(truncated);
    // 再次 trim 以防末尾乱码
    result = result.replace(/\s+$/, "");
  }

  return result;
}

/**
 * 检测提示注入攻击。
 * 检查输入中是否包含试图覆盖或操纵系统提示词的内容。
 *
 * @returns {safe: boolean, risk?: string}
 *   safe=false 时附带 risk 描述
 */
export function detectPromptInjection(
  input: string
): { safe: boolean; risk?: string } {
  if (typeof input !== "string" || input.length === 0) {
    return { safe: true };
  }

  for (const { pattern, risk } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      const match = input.match(pattern);
      return {
        safe: false,
        risk: `提示注入风险: ${risk} (匹配: "${match?.[0]?.substring(0, 60)}")`,
      };
    }
  }

  return { safe: true };
}
