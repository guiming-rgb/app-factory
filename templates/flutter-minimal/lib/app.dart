import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "core/i18n/app_localizations.dart";
import "core/monitoring/crash_reporter.dart";
import "core/theme/app_theme.dart";

class AppFactoryApp extends StatelessWidget {
  const AppFactoryApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: "App Factory",
      theme: createAppTheme(),
      routerConfig: router,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      localeResolutionCallback: (locale, supportedLocales) {
        for (final supported in supportedLocales) {
          if (supported.languageCode == locale?.languageCode &&
              (supported.countryCode == null ||
               supported.countryCode == locale?.countryCode)) {
            return supported;
          }
        }
        return supportedLocales.first;
      },
    );
  }
}
