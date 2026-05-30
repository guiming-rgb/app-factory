import fs from "fs";
import path from "path";

export type HarmonyStructureStatus = "passed" | "failed" | "skipped";

export type HarmonyStructureResult = {
  status: HarmonyStructureStatus;
  reason?: string;
  filesChecked?: number;
};

const REQUIRED = [
  "AppScope/app.json5",
  "entry/src/main/module.json5",
  "entry/src/main/ets/pages/Index.ets",
  "entry/src/main/ets/entryability/EntryAbility.ets",
  "oh-package.json5",
  "build-profile.json5"
];

/** C6 结构门禁（无需 DevEco/hvigor） */
export function runHarmonyStructureValidate(options: {
  appDir: string;
}): HarmonyStructureResult {
  if (process.env.CODEGEN_HARMONY_STRUCTURE_DISABLED === "1") {
    return { status: "skipped", reason: "CODEGEN_HARMONY_STRUCTURE_DISABLED=1" };
  }

  let checked = 0;
  for (const rel of REQUIRED) {
    const full = path.join(options.appDir, rel);
    if (!fs.existsSync(full)) {
      return {
        status: "failed",
        reason: `缺少 ${rel}`,
        filesChecked: checked
      };
    }
    checked++;
  }

  const index = fs.readFileSync(
    path.join(options.appDir, "entry/src/main/ets/pages/Index.ets"),
    "utf8"
  );
  if (index.includes("__DISPLAY_NAME__")) {
    return {
      status: "failed",
      reason: "Index.ets 仍含未替换占位符",
      filesChecked: checked
    };
  }

  const mainPagesPath = path.join(
    options.appDir,
    "entry/src/main/resources/base/profile/main_pages.json"
  );
  if (fs.existsSync(mainPagesPath)) {
    try {
      const mainPages = JSON.parse(fs.readFileSync(mainPagesPath, "utf8")) as {
        src?: string[];
      };
      for (const route of mainPages.src ?? []) {
        const etsPath = path.join(
          options.appDir,
          "entry/src/main/ets",
          `${route}.ets`
        );
        if (!fs.existsSync(etsPath)) {
          return {
            status: "failed",
            reason: `main_pages 引用缺失 ${route}.ets`,
            filesChecked: checked
          };
        }
        checked++;
      }
    } catch {
      return {
        status: "failed",
        reason: "main_pages.json 解析失败",
        filesChecked: checked
      };
    }
  }

  return { status: "passed", filesChecked: checked };
}

export function shouldFailCodegenOnHarmonyStructure(
  result: HarmonyStructureResult
): boolean {
  if (result.status !== "failed") return false;
  if (process.env.CODEGEN_HARMONY_STRUCTURE_STRICT === "0") return false;
  return true;
}
