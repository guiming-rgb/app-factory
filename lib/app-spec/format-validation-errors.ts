/** 将 AJV 校验错误转为 LLM 可执行的修复提示 */
export function formatValidationErrorsForLlm(errors: string[]): string[] {
  const hints: string[] = [];

  for (const raw of errors) {
    hints.push(raw);

    if (raw.includes("appName") && raw.includes("pattern")) {
      hints.push("→ appName 必须小写字母开头，仅 [a-z0-9_]，2～48 字符，如 kids_soccer");
    }
    if (raw.includes("/screens/") && raw.includes('"type"')) {
      hints.push(
        "→ screen.type 只能是：tabRoot | list | detail | form | placeholder"
      );
      hints.push(
        "→ 不要把 screen.id（如 home、match_list）当作 type；home 页用 tabRoot，列表用 list，「我的」用 placeholder"
      );
    }
    if (raw.includes("/screens/") && raw.includes('"id"')) {
      hints.push("→ screen.id 必须匹配 ^[a-z][a-z0-9_]*$，如 match_list、profile");
    }
    if (raw.includes("targets/flutter") && raw.includes("platforms")) {
      hints.push(
        '→ targets.flutter.platforms 须含 ios/android，建议含 macos/windows 以支持桌面安装'
      );
    }
    if (raw.includes("targets/flutter") && raw.includes("formFactors")) {
      hints.push('→ targets.flutter.formFactors 必须包含 ["phone"]');
    }
    if (raw.includes("navigation") && raw.includes("tabs")) {
      hints.push("→ navigation.tabs 必须是 screen.id 数组，至少 2 个 tab 页面 id");
    }
    if (raw.includes("limitations")) {
      hints.push("→ limitations 必须是非空字符串数组，描述首版不做的事");
    }
  }

  return [...new Set(hints)];
}
