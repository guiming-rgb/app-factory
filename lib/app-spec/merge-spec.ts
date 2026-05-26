import type { AppSpec } from "./types";
import { normalizeSpecNavigation } from "./normalize-navigation";
import { normalizeSpecScreens } from "./normalize-screens";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/** 用 minimal 模板补齐 LLM 输出中缺失的必填字段 */
export function mergeSpecWithMinimal(
  partial: Record<string, unknown>,
  minimal: AppSpec
): AppSpec {
  const minTargets = asRecord(minimal.targets);
  const minFlutter = asRecord(minTargets.flutter);
  const minWechat = asRecord(minTargets.wechatMiniProgram);
  const minBackend = asRecord(minTargets.backend);

  const targets = asRecord(partial.targets);
  const flutter = asRecord(targets.flutter);
  const wechat = asRecord(targets.wechatMiniProgram);
  const backend = asRecord(targets.backend);

  const screens = normalizeSpecScreens(partial.screens, minimal);
  const navigation = normalizeSpecNavigation(
    screens,
    partial.navigation,
    minimal
  );

  return {
    ...minimal,
    ...(partial as Partial<AppSpec>),
    specVersion: "0.1.0",
    appName:
      typeof partial.appName === "string" && /^[a-z][a-z0-9_]*$/.test(partial.appName)
        ? partial.appName.slice(0, 48)
        : minimal.appName,
    displayName:
      typeof partial.displayName === "string" && partial.displayName.trim()
        ? partial.displayName.trim()
        : minimal.displayName,
    targets: {
      ...minTargets,
      ...targets,
      flutter: {
        ...minFlutter,
        ...flutter,
        enabled: flutter.enabled !== false,
        platforms:
          Array.isArray(flutter.platforms) && flutter.platforms.length > 0
            ? flutter.platforms
            : minFlutter.platforms ?? ["ios", "android"],
        formFactors:
          Array.isArray(flutter.formFactors) && flutter.formFactors.length > 0
            ? flutter.formFactors
            : minFlutter.formFactors ?? ["phone"]
      },
      wechatMiniProgram: {
        ...minWechat,
        ...wechat
      },
      backend: {
        ...minBackend,
        ...backend,
        provider:
          typeof backend.provider === "string"
            ? backend.provider
            : minBackend.provider ?? "supabase"
      }
    },
    screens: screens,
    navigation,
    limitations:
      Array.isArray(partial.limitations) && partial.limitations.length > 0
        ? (partial.limitations as string[])
        : minimal.limitations
  };
}
