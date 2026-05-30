/** App Spec v0.1 — Generator / Validator 共用类型（子集） */

export type WechatLoginMethod = "wechat" | "phone" | "none";

export type WechatSubPackage = {
  root: string;
  pages: string[];
  name?: string;
};

export type WechatMiniProgramTarget = {
  enabled: boolean;
  tabBar?: string[];
  loginMethod?: WechatLoginMethod;
  subPackages?: WechatSubPackage[];
};

export type BackendTargetSpec = {
  provider: "supabase" | "nest" | "custom";
  regionHint?: string;
};

export type AppSpecScreen = {
  id: string;
  title: string;
  type: string;
  children?: string[];
  entity?: string;
};

export type AppSpec = {
  specVersion: string;
  appName: string;
  displayName: string;
  sourceProjectId?: string;
  targets?: Record<string, unknown>;
  entities?: unknown[];
  screens: AppSpecScreen[];
  navigation?: { tabs?: string[] };
  roles?: unknown[];
  auth?: Record<string, unknown>;
  api?: unknown[];
  layoutRules?: Record<string, unknown>;
  complianceFlags?: Record<string, unknown>;
  limitations?: string[];
  metadata?: Record<string, unknown>;
};
