import type { AppSpec } from "@/lib/app-spec/types";
import {
  detectIndustry,
  type IndustryCategory
} from "./emit-industry";

/** 根据 Spec 与 screen type 决定应叠加的行业模板目录 */
export function resolveIndustriesToCopy(spec: AppSpec): IndustryCategory[] {
  const set = new Set<IndustryCategory>();
  const detected = detectIndustry(spec as unknown as Record<string, unknown>);
  if (detected !== "generic") set.add(detected);

  for (const screen of spec.screens) {
    if (screen.type === "game") set.add("game");
    if (screen.type === "payment") set.add("payment");
  }

  return [...set];
}

export async function industryFeatureExists(
  appDir: string,
  feature: "game" | "payment"
): Promise<boolean> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const servicePath = path.join(
    appDir,
    "lib",
    "features",
    feature,
    "services",
    `${feature}_service.dart`
  );
  try {
    await fs.access(servicePath);
    return true;
  } catch {
    return false;
  }
}
