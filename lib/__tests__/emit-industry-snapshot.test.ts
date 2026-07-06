import { describe, it, expect } from "vitest";
import { getIndustryWidgetsDart } from "@/lib/flutter-codegen/emit-industry";
import { emitFlutterMedicalBLEDevice } from "@/lib/flutter-codegen/emit-medical";
import { P2_PILOT_INDUSTRIES } from "@/lib/app-spec/emit-shared/pilot";
import { getIndustryEmitConfig } from "@/lib/app-spec/emit-shared";

/**
 * Phase2 B1: Mustache 为唯一 Widget 真源（legacy bare-string 已退役）
 */
describe("emit industry Mustache (19 行业)", () => {
  const baseSpec = {
    specVersion: "0.1.0" as const,
    appName: "pilot_app",
    screens: [],
    navigation: { tabs: [] as string[] },
  };

  for (const industry of P2_PILOT_INDUSTRIES) {
    const cfg = getIndustryEmitConfig(industry);
    const widgetClass = cfg?.widgetClasses?.[0];
    if (!widgetClass) continue;

    it(`${industry} Mustache widgets 含 ${widgetClass}`, async () => {
      const dart = await getIndustryWidgetsDart(industry, {
        ...baseSpec,
        displayName: cfg?.displayName ?? industry,
        metadata: { category: industry },
      });
      expect(dart).toBeTruthy();
      expect(dart!).toContain(widgetClass);
    });
  }

  it("finance/ecommerce/medical snapshot 回归", async () => {
    for (const [industry, widgetClass] of [
      ["finance", "TransactionTile"],
      ["ecommerce", "ProductCardEnhanced"],
      ["medical", "DoctorCard"],
    ] as const) {
      const dart = await getIndustryWidgetsDart(industry, {
        ...baseSpec,
        displayName: industry,
        metadata: { category: industry },
      });
      expect(dart!).toContain(widgetClass);
      expect(dart!).toMatchSnapshot();
    }
  });
});

describe("emit medical BLE (非 Mustache 专项)", () => {
  it("medical BLE device widget", () => {
    expect(emitFlutterMedicalBLEDevice()).toMatchSnapshot();
  });
});
