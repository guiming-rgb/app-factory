/**
 * P1: 多语言模板（中文/英文/日文）
 * 根据 spec.metadata.locale 生成对应语言的 UI 文本
 */

export type Locale = "zh" | "en" | "ja";

type I18nDict = Record<string, string>;

const DICTS: Record<Locale, I18nDict> = {
  zh: {
    login: "登录",
    register: "注册",
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    loginTitle: "登录以使用完整功能",
    registerTitle: "加入",
    noAccount: "没有账号？立即注册",
    submit: "提交",
    cancel: "取消",
    save: "保存",
    search: "搜索",
    loadMore: "加载更多",
    noData: "暂无数据",
    loading: "加载中…",
    success: "成功",
    error: "错误",
    profile: "个人中心",
    about: "关于应用",
    settings: "功能设置",
    healthDashboard: "健康数据",
    medication: "用药提醒",
    medicalDevices: "医疗设备",
    carDashboard: "车载仪表盘",
    tripLog: "行程记录",
    payment: "支付",
    insurance: "保险",
    kyc: "身份验证",
    chat: "消息",
    map: "地图",
    game: "游戏",
    list: "列表",
    detail: "详情",
    add: "添加",
    delete: "删除",
    edit: "编辑",
    refresh: "刷新",
    download: "下载",
    preview: "预览",
    required: "不能为空",
    minLength: "至少 {n} 位",
    invalidEmail: "请输入有效邮箱",
    passwordMismatch: "两次密码不一致",
    networkError: "网络错误，请重试",
    unknown: "未知",
  },
  en: {
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    loginTitle: "Login to use full features",
    registerTitle: "Join",
    noAccount: "No account? Register now",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    search: "Search",
    loadMore: "Load More",
    noData: "No Data",
    loading: "Loading…",
    success: "Success",
    error: "Error",
    profile: "Profile",
    about: "About",
    settings: "Settings",
    healthDashboard: "Health Dashboard",
    medication: "Medication",
    medicalDevices: "Medical Devices",
    carDashboard: "Dashboard",
    tripLog: "Trip Log",
    payment: "Payment",
    insurance: "Insurance",
    kyc: "Identity Verification",
    chat: "Messages",
    map: "Map",
    game: "Game",
    list: "List",
    detail: "Detail",
    add: "Add",
    delete: "Delete",
    edit: "Edit",
    refresh: "Refresh",
    download: "Download",
    preview: "Preview",
    required: "Required",
    minLength: "At least {n} characters",
    invalidEmail: "Please enter a valid email",
    passwordMismatch: "Passwords do not match",
    networkError: "Network error, please retry",
    unknown: "Unknown",
  },
  ja: {
    login: "ログイン",
    register: "登録",
    email: "メールアドレス",
    password: "パスワード",
    confirmPassword: "パスワード確認",
    loginTitle: "ログインして全機能を使用",
    registerTitle: "参加",
    noAccount: "アカウントをお持ちでない方は登録",
    submit: "送信",
    cancel: "キャンセル",
    save: "保存",
    search: "検索",
    loadMore: "もっと読み込む",
    noData: "データなし",
    loading: "読み込み中…",
    success: "成功",
    error: "エラー",
    profile: "プロフィール",
    about: "について",
    settings: "設定",
    healthDashboard: "健康データ",
    medication: "服薬リマインダー",
    medicalDevices: "医療機器",
    carDashboard: "ダッシュボード",
    tripLog: "走行記録",
    payment: "支払い",
    insurance: "保険",
    kyc: "本人確認",
    chat: "メッセージ",
    map: "地図",
    game: "ゲーム",
    list: "リスト",
    detail: "詳細",
    add: "追加",
    delete: "削除",
    edit: "編集",
    refresh: "更新",
    download: "ダウンロード",
    preview: "プレビュー",
    required: "必須",
    minLength: "{n}文字以上",
    invalidEmail: "有効なメールアドレスを入力してください",
    passwordMismatch: "パスワードが一致しません",
    networkError: "ネットワークエラー、再試行してください",
    unknown: "不明",
  },
};

export function resolveLocale(spec: { metadata?: Record<string, unknown> }): Locale {
  const locale = (spec.metadata?.locale as string)?.toLowerCase();
  if (locale && (locale === "zh" || locale === "en" || locale === "ja")) return locale as Locale;
  if (locale?.startsWith("en")) return "en";
  if (locale?.startsWith("ja")) return "ja";
  return "zh"; // 默认中文
}

/** 生成 Flutter i18n 工具类 */
export function emitFlutterI18nDart(locale: Locale): string {
  const dict = DICTS[locale];
  const entries = Object.entries(dict)
    .map(([k, v]) => `  static const ${k} = "${v.replace(/"/g, '\\"')}";`)
    .join("\n");

  return `/// 多语言文本（由 App 生产工厂自动生成）
/// locale: ${locale}
class AppStrings {
${entries}
}
`;
}

export function i18n(locale: Locale, key: string): string {
  return DICTS[locale]?.[key] ?? DICTS.zh[key] ?? key;
}

/** 根据 locale 生成 Flutter MaterialApp 的 locale 配置 */
export function emitFlutterLocaleConfig(locale: Locale): string {
  const localeCode = locale === "zh" ? "zh_CN" : locale === "ja" ? "ja_JP" : "en_US";
  const delegateImport = locale !== "zh" ? '\nimport "package:flutter_localizations/flutter_localizations.dart";' : "";
  const delegates = locale !== "zh"
    ? "      localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],\n      supportedLocales: const [Locale('${localeCode}')],"
    : "";

  return `${delegateImport}
// locale: ${locale}
${delegates ? `// 在 MaterialApp.router 中添加:\n${delegates}` : "// 中文默认，无需额外配置"}`;
}
