import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

class AppFactoryApp extends StatelessWidget {
  const AppFactoryApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: "App 生产工厂模板",
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
