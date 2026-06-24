import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import hilog from '@ohos.hilog';
import UIAbility from '@ohos.app.ability.UIAbility';
import Want from '@ohos.app.ability.Want';
import window from '@ohos.window';
import { I18n } from '../utils/I18n';
import { CrashReporter } from '../utils/CrashReporter';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'AppFactory', 'EntryAbility onCreate');
    // Initialize i18n with application context
    I18n.init(this.context);
    // Initialize crash reporter
    CrashReporter.init();
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(0x0000, 'AppFactory', 'Failed to load content. Cause: %{public}s', JSON.stringify(err));
        CrashReporter.reportError(new Error('Failed to load content'), { error: JSON.stringify(err) });
        return;
      }
      hilog.info(0x0000, 'AppFactory', 'Succeeded in loading content.');
    });
  }

  onDestroy(): void {
    hilog.info(0x0000, 'AppFactory', 'EntryAbility onDestroy');
  }
}
