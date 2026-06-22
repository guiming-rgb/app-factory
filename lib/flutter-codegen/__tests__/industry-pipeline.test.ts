import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";

import { TEMPLATE_LIBRARY, getTemplateById } from "@/lib/app-spec/template-library";
import { generateFlutterProject } from "@/lib/flutter-codegen/generate";
import { generateWechatProject } from "@/lib/wechat-codegen/generate";
import { generateHarmonyProject } from "@/lib/harmony-codegen/generate";
import { resolveIndustriesToCopy } from "@/lib/flutter-codegen/resolve-industries";

const EXPECTED_INDUSTRY_SERVICE: Record<string, string> = {
  ecommerce: "lib/features/ecommerce/services/ecommerce_service.dart",
  social: "lib/features/social/services/social_service.dart",
  crm: "lib/features/crm/services/crm_service.dart",
  blog: "lib/features/blog/services/blog_service.dart",
  fitness: "lib/features/fitness/services/fitness_service.dart",
  food_delivery: "lib/features/food/services/food_service.dart",
  hotel_booking: "lib/features/hotel/services/hotel_service.dart",
  recruitment: "lib/features/recruitment/services/recruitment_service.dart",
  property: "lib/features/property/services/property_service.dart",
  schedule: "lib/features/education/services/education_service.dart",
  entertainment: "lib/features/video/services/video_service.dart",
  finance_tracker: "lib/features/finance/services/finance_service.dart",
  medical_appointment: "lib/features/medical/services/medical_service.dart",
  weather: "lib/features/weather/services/weather_service.dart",
  sports: "lib/features/sports/services/sports_service.dart",
  photo_share: "lib/features/photo/services/photo_service.dart",
  dating: "lib/features/dating/services/dating_service.dart",
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe("Industry pipeline", () => {
  it("resolveIndustriesToCopy 应识别记账与支付 screen", () => {
    const spec = getTemplateById("finance_tracker")!.spec;
    const industries = resolveIndustriesToCopy(spec);
    expect(industries).toContain("finance");
  });

  it("电商模板应叠加 payment 行业并生成 PaymentService 结算页", async () => {
    const spec = getTemplateById("ecommerce")!.spec;
    const { outputDir } = await generateFlutterProject(spec);
    try {
      expect(await exists(path.join(outputDir, "lib/features/ecommerce/services/ecommerce_service.dart"))).toBe(true);
      expect(await exists(path.join(outputDir, "lib/features/payment/services/payment_service.dart"))).toBe(true);
      const checkout = await fs.readFile(
        path.join(outputDir, "lib/generated/pages/checkout_payment_page.dart"),
        "utf8"
      );
      expect(checkout).toContain("PaymentService");
      expect(checkout).not.toContain("emit-advanced");
    } finally {
      await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
    }
  }, 60000);

  it("game screen 应叠加 industry-game 并引用 SimpleGame", async () => {
    const spec = {
      specVersion: "0.1.0",
      appName: "kids_game",
      displayName: "少儿足球",
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["play"] },
        { id: "play", title: "踢球", type: "game" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      entities: [],
      navigation: { tabs: ["play", "profile"] },
      targets: {
        flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
        backend: { provider: "supabase" },
      },
      limitations: ["单机休闲"],
    };

    const { outputDir } = await generateFlutterProject(spec);
    try {
      expect(await exists(path.join(outputDir, "lib/features/game/services/game_service.dart"))).toBe(true);
      const gamePage = await fs.readFile(
        path.join(outputDir, "lib/generated/pages/play_game_page.dart"),
        "utf8"
      );
      expect(gamePage).toContain("SimpleGame");
      expect(gamePage).toContain("flame/game.dart");
    } finally {
      await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
    }
  }, 60000);

  it.each(TEMPLATE_LIBRARY.map((t) => [t.id, t.name] as const))(
    "行业模板 %s (%s) Spec→Flutter ZIP 结构应通过",
    async (templateId) => {
      const template = getTemplateById(templateId);
      if (!template) throw new Error(`missing ${templateId}`);
      const { outputDir } = await generateFlutterProject(template.spec);
      try {
        expect(await exists(path.join(outputDir, "pubspec.yaml"))).toBe(true);
        expect(await exists(path.join(outputDir, "lib/router/app_router.dart"))).toBe(true);

        const serviceRel = EXPECTED_INDUSTRY_SERVICE[templateId];
        if (serviceRel) {
          expect(await exists(path.join(outputDir, serviceRel))).toBe(true);
        }

        const industries = resolveIndustriesToCopy(template.spec);
        expect(industries.length).toBeGreaterThan(0);
      } finally {
        await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
      }
    },
    60000
  );

  it("扩展页 Spec 应三栈生成 chart/onboarding", async () => {
    const spec = getTemplateById("finance_tracker")!.spec;
    const { outputDir: flutterDir } = await generateFlutterProject(spec);
    const { outputDir: wechatDir } = await generateWechatProject(spec);
    const { outputDir: harmonyDir } = await generateHarmonyProject(spec);
    try {
      expect(await exists(path.join(flutterDir, "lib/generated/pages/report_chart_page.dart"))).toBe(true);

      const wechatGenerate = await fs.readFile(
        path.join(process.cwd(), "lib/wechat-codegen/generate.ts"),
        "utf8"
      );
      expect(wechatGenerate).toContain('"chart"');
      expect(wechatGenerate).toContain('"onboarding"');

      const harmonyGenerate = await fs.readFile(
        path.join(process.cwd(), "lib/harmony-codegen/generate.ts"),
        "utf8"
      );
      expect(harmonyGenerate).toContain("emitHarmonyChart");
      expect(harmonyGenerate).toContain("emitHarmonyOnboarding");

      expect(wechatDir).toBeTruthy();
      expect(harmonyDir).toBeTruthy();
    } finally {
      await fs.rm(path.dirname(flutterDir), { recursive: true, force: true });
      await fs.rm(path.dirname(wechatDir), { recursive: true, force: true });
      await fs.rm(path.dirname(harmonyDir), { recursive: true, force: true });
    }
  }, 90000);
});
