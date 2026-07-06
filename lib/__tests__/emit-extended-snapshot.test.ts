import { describe, it, expect } from "vitest";
import { emitFlutterDashboardPage } from "@/lib/flutter-codegen/emit-extended/dashboard";
import { emitFlutterKYCVerification } from "@/lib/flutter-codegen/emit-fintech/kyc";

describe("emit extended/fintech Mustache (B2 pilot)", () => {
  const spec = {
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
        ],
      },
    ],
    screens: [{ id: "stats", title: "统计看板", type: "dashboard" }],
  };

  it("dashboard Mustache 应含 fl_chart 与 SummaryCard", async () => {
    const dart = await emitFlutterDashboardPage(spec.screens[0], spec);
    expect(dart).toContain("fl_chart");
    expect(dart).toContain("StatsDashboardPage");
    expect(dart).toContain("_SummaryCard");
    expect(dart).toMatchSnapshot();
  });

  it("kyc Mustache 应含 KYCVerificationPage", async () => {
    const dart = await emitFlutterKYCVerification();
    expect(dart).toContain("KYCVerificationPage");
    expect(dart).toContain("身份验证");
    expect(dart).toMatchSnapshot();
  });
});
