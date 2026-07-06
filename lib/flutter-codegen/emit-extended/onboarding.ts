import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildOnboardingPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

export async function emitFlutterOnboardingPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "onboarding",
    screen,
    spec,
    buildOnboardingPageContext,
    () => `// onboarding legacy fallback`,
  );
}
