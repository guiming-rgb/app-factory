import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "core/theme/app_theme.dart";

class AppFactoryApp extends StatelessWidget {
  const AppFactoryApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: "App 生产工厂模板",
      theme: createAppTheme(),
      routerConfig: router,
    );
  }
}
