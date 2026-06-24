/**
 * App Store 发布核心类型与工具函数。
 *
 * 支持四个发布目标：App Store Connect / Google Play / 微信小程序 / 华为应用市场。
 *
 * @module store-publish
 */

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

/** 支持的发布目标平台 */
export type PublishTarget =
  | "app_store_connect"
  | "google_play"
  | "wechat_miniprogram"
  | "huawei_app_gallery";

/** 发布配置 */
export interface PublishConfig {
  target: PublishTarget;
  appId: string;
  credentials: Record<string, string>;
  version: string;
  buildNumber: number;
  changelog: string;
  screenshots?: string[];
  reviewNotes?: string;
}

/** 发布状态枚举 */
export type PublishStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "published";

/** 发布校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 各平台对字段的非空约束定义。
 * key 为字段名，value 为人类可读的中文标签。
 */
const TARGET_REQUIRED_FIELDS: Record<PublishTarget, Record<string, string>> = {
  app_store_connect: {
    appId: "App ID（bundle identifier）",
    credentials_issuer_id: "Issuer ID",
    credentials_key_id: "API Key ID",
    credentials_key_p8: "API Private Key (.p8)",
    credentials_provider: "Provider（Team ID）",
  },
  google_play: {
    appId: "应用包名（package name）",
    credentials_service_account_json: "服务帐号 JSON 密钥",
  },
  wechat_miniprogram: {
    appId: "小程序 AppID",
    credentials_app_secret: "AppSecret",
  },
  huawei_app_gallery: {
    appId: "应用包名",
    credentials_client_id: "OAuth 2.0 Client ID",
    credentials_client_secret: "OAuth 2.0 Client Secret",
  },
};

// ──────────────────────────────────────────────
// 校验
// ──────────────────────────────────────────────

/**
 * 校验发布配置，返回是否合法及错误信息列表。
 *
 * - 检查必填字段是否填写（每个平台要求的 credential key 不同）
 * - 检查 version 格式是否符合 semver
 * - 检查 buildNumber 是否为正整数
 * - 检查 changelog 是否为空
 */
export function validatePublishConfig(config: PublishConfig): ValidationResult {
  const errors: string[] = [];

  // 1. target 枚举
  const validTargets: PublishTarget[] = [
    "app_store_connect",
    "google_play",
    "wechat_miniprogram",
    "huawei_app_gallery",
  ];
  if (!validTargets.includes(config.target)) {
    errors.push(`不支持的发布目标：${config.target}`);
    return { valid: false, errors };
  }

  // 2. appId 必填
  if (!config.appId?.trim()) {
    errors.push(`${config.target} 的 App ID / 包名不能为空`);
  }

  // 3. 平台特有必填 credentials
  const requiredFields = TARGET_REQUIRED_FIELDS[config.target];
  for (const [key, label] of Object.entries(requiredFields)) {
    const credentialKey = key.replace("credentials_", "");
    const value = config.credentials?.[credentialKey];
    if (!value?.trim()) {
      errors.push(`缺少 ${config.target} 的 ${label}（credentials.${credentialKey}）`);
    }
  }

  // 4. version semver 校验
  if (config.version) {
    const semver = /^\d+\.\d+\.\d+$/;
    if (!semver.test(config.version)) {
      errors.push(`版本号格式错误：${config.version}，应为 semver 格式（如 1.0.0）`);
    }
  } else {
    errors.push("version 不能为空");
  }

  // 5. buildNumber 正整数校验
  if (config.buildNumber == null || !Number.isInteger(config.buildNumber) || config.buildNumber < 1) {
    errors.push("buildNumber 必须为正整数");
  }

  // 6. changelog 非空
  if (!config.changelog?.trim()) {
    errors.push("changelog（更新说明）不能为空");
  }

  // 7. screenshots 可选校验（建议提交截图）
  if (config.screenshots !== undefined) {
    if (!Array.isArray(config.screenshots)) {
      errors.push("screenshots 必须是字符串数组");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ──────────────────────────────────────────────
// 发布检查清单
// ──────────────────────────────────────────────

/**
 * 返回每个平台应用商店提审前的检查清单。
 * 帮助开发者逐项确认所有素材与配置已准备就绪。
 */
export function getPublishChecklist(target: PublishTarget): string[] {
  switch (target) {
    case "app_store_connect":
      return [
        "App ID（bundle identifier）已在 Apple Developer 注册",
        "App Store Connect API Key（Issuer ID + Key ID + .p8）已生成",
        "Distribution Certificate（iOS Dist / Apple Distribution）已配置",
        "Provisioning Profile（App Store）已关联证书与 App ID",
        "应用图标 1024x1024（png，无圆角、无透明）",
        "6.5 英寸截图至少 5 张（1242×2688 或 1284×2778）",
        "隐私政策 URL（Privacy Policy）已配置",
        "最终用户许可协议（EULA）可选但推荐",
        "App 描述、关键词、技术支持 URL 已填写",
        "版本发布方式选择「手动发布」或「自动发布」",
      ];
    case "google_play":
      return [
        "Android App Bundle（.aab）或 APK 已构建",
        "上传签名密钥（Upload Keystore）已生成并备份",
        "Google Play Console 服务帐号 JSON 密钥已创建",
        "应用图标 512x512（png，32-bit，含 16-bit 自适应）",
        "Feature Graphic 1024×500（promo 素材）",
        "截图至少 4 张（至少 2 张手机截图 + 1 张 7 寸平板）",
        "隐私政策已在 Play Console 中关联",
        "内容分级问卷已填写",
        "App 内商品 / 订阅可选，需先提交定价",
        "发布轨道选择：内部测试 / 封闭测试 / 公开测试 / 正式版",
      ];
    case "wechat_miniprogram":
      return [
        "微信小程序 AppID 已在微信公众平台注册",
        "小程序备案号已获取（工信部备案 + 公安备案）",
        "服务类目已选择且与代码一致",
        "类目资质文件（如适用：食品经营许可证、ICP 证等）",
        "隐私保护指引已配置（用户隐私数据收集说明）",
        "144×144 像素应用图标（png，不超过 140KB）",
        "服务器域名白名单已配置（request / socket / uploadFile / downloadFile）",
        "业务域名已校验（web-view 组件需配置）",
        "代码已通过 wcc 编译 & 本地校验通过",
        "插件版本（如有）已更新至最新",
      ];
    case "huawei_app_gallery":
      return [
        "华为 AppGallery Connect 帐号已注册并实名认证",
        "应用 DUID / 包名在 AppGallery Connect 中创建",
        "签名证书指纹（SHA-256）已配置",
        "512×512 像素应用图标（png）",
        "截图至少 4 张（1280×720 或 1920×1080）",
        "隐私声明地址已填写",
        "备案号已获取（工信部 ICP 备案）",
        "分发国家/地区已选择",
        "App 描述与分类已填写",
        "API 密钥（OAuth 2.0 Client ID + Secret）已生成",
      ];
    default: {
      const _exhaustive: never = target;
      return [];
    }
  }
}

// ──────────────────────────────────────────────
// 状态格式化
// ──────────────────────────────────────────────

/**
 * 发布结果类型。不同平台返回的 store_response 结构各异，
 * 统一通过本接口描述关键状态。
 */
export interface PublishResult {
  target: PublishTarget;
  appId: string;
  version: string;
  buildNumber: number;
  status: PublishStatus;
  storeResponse?: Record<string, unknown>;
  errorMessage?: string;
  submittedAt: string;
  publishedAt?: string;
}

/**
 * 将发布结果格式化为人类可读的中文描述字符串。
 */
export function formatPublishResult(result: PublishResult): string {
  const targetLabels: Record<PublishTarget, string> = {
    app_store_connect: "App Store Connect",
    google_play: "Google Play",
    wechat_miniprogram: "微信小程序",
    huawei_app_gallery: "华为应用市场",
  };

  const statusLabels: Record<PublishStatus, string> = {
    draft: "草稿",
    submitted: "已提交",
    in_review: "审核中",
    approved: "已通过",
    rejected: "被拒",
    published: "已上架",
  };

  const targetLabel = targetLabels[result.target] ?? result.target;
  const statusLabel = statusLabels[result.status] ?? result.status;

  const lines: string[] = [
    `━━━ 发布报告 ━━━`,
    `目标平台 : ${targetLabel}`,
    `应用 ID  : ${result.appId}`,
    `版本      : ${result.version} (build ${result.buildNumber})`,
    `状态      : ${statusLabel}`,
    `提交时间  : ${result.submittedAt}`,
  ];

  if (result.publishedAt) {
    lines.push(`上架时间  : ${result.publishedAt}`);
  }
  if (result.errorMessage) {
    lines.push(`错误信息  : ${result.errorMessage}`);
  }

  lines.push(`━━━━━━━━━━━`);
  return lines.join("\n");
}

// ──────────────────────────────────────────────
// 辅助工具
// ──────────────────────────────────────────────

/** 平台标签映射 */
export function getPublishTargetLabel(target: PublishTarget): string {
  const labels: Record<PublishTarget, string> = {
    app_store_connect: "App Store Connect",
    google_play: "Google Play",
    wechat_miniprogram: "微信小程序",
    huawei_app_gallery: "华为应用市场",
  };
  return labels[target] ?? target;
}

/** 状态标签映射 */
export function getPublishStatusLabel(status: PublishStatus): string {
  const labels: Record<PublishStatus, string> = {
    draft: "草稿",
    submitted: "已提交",
    in_review: "审核中",
    approved: "已通过",
    rejected: "被拒",
    published: "已上架",
  };
  return labels[status] ?? status;
}

/** 该状态是否表示「最终状态」（不会再自动变更） */
export function isTerminalStatus(status: PublishStatus): boolean {
  return status === "approved" || status === "rejected" || status === "published";
}

/** 可自动推进的下一个状态 */
export function getNextPublishStatus(current: PublishStatus): PublishStatus | null {
  const transitions: Record<PublishStatus, PublishStatus | null> = {
    draft: "submitted",
    submitted: "in_review",
    in_review: "approved",
    approved: "published",
    rejected: null,
    published: null,
  };
  return transitions[current] ?? null;
}
