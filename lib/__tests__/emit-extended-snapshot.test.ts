import { describe, it, expect } from "vitest";
import { emitFlutterDashboardPage } from "@/lib/flutter-codegen/emit-extended/dashboard";
import { emitFlutterOnboardingPage } from "@/lib/flutter-codegen/emit-extended/onboarding";
import { emitFlutterCalendarPage } from "@/lib/flutter-codegen/emit-extended/calendar";
import { emitFlutterKanbanPage } from "@/lib/flutter-codegen/emit-extended/kanban";
import { emitFlutterCardGridPage } from "@/lib/flutter-codegen/emit-extended/card-grid";
import { emitFlutterChartPage } from "@/lib/flutter-codegen/emit-extended/chart";
import { emitFlutterKYCVerification } from "@/lib/flutter-codegen/emit-fintech/kyc";
import { emitFlutterInsuranceClaims } from "@/lib/flutter-codegen/emit-fintech/insurance";

describe("emit extended/fintech Mustache (B2)", () => {
  const baseSpec = {
    specVersion: "0.1.0" as const,
    appName: "pilot_app",
    displayName: "试点应用",
    entities: [
      {
        name: "items",
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "amount", type: "number" },
          { name: "created_at", type: "datetime" },
          { name: "status", type: "string" },
        ],
      },
    ],
    screens: [],
  };

  it("dashboard Mustache 应含 fl_chart", async () => {
    const dart = await emitFlutterDashboardPage(
      { id: "stats", title: "统计看板", type: "dashboard" },
      baseSpec,
    );
    expect(dart).toContain("fl_chart");
    expect(dart).toContain("StatsDashboardPage");
  });

  it("onboarding Mustache 应含 PageView", async () => {
    const dart = await emitFlutterOnboardingPage(
      { id: "intro", title: "引导", type: "onboarding" },
      baseSpec,
    );
    expect(dart).toContain("PageView");
    expect(dart).toContain("IntroPage");
  });

  it("calendar Mustache 应含 TableCalendar", async () => {
    const dart = await emitFlutterCalendarPage(
      { id: "schedule", title: "日程", type: "calendar" },
      baseSpec,
    );
    expect(dart).toContain("TableCalendar");
  });

  it("kanban Mustache 应含 _KanbanColumn", async () => {
    const dart = await emitFlutterKanbanPage(
      { id: "board", title: "看板", type: "kanban" },
      baseSpec,
    );
    expect(dart).toContain("_KanbanColumn");
  });

  it("card-grid Mustache 应含 GridView", async () => {
    const dart = await emitFlutterCardGridPage(
      { id: "gallery", title: "网格", type: "card_grid" },
      baseSpec,
    );
    expect(dart).toContain("GridView");
  });

  it("chart Mustache 应含 BarChart", async () => {
    const dart = await emitFlutterChartPage(
      { id: "analytics", title: "分析", type: "chart" },
      baseSpec,
    );
    expect(dart).toContain("BarChart");
  });

  it("kyc Mustache 应含 KYCVerificationPage", async () => {
    const dart = await emitFlutterKYCVerification();
    expect(dart).toContain("KYCVerificationPage");
  });

  it("insurance Mustache 应含 InsurancePage", async () => {
    const dart = await emitFlutterInsuranceClaims();
    expect(dart).toContain("InsurancePage");
    expect(dart).toContain("_TabButton");
  });
});
