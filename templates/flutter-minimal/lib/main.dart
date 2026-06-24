import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "app.dart";
import "core/monitoring/crash_reporter.dart";
import "core/supabase/supabase_client.dart";
import "router/app_router.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize crash reporting
  CrashReporter.init();

  await initSupabaseIfConfigured();
  final router = createAppRouter();

  runApp(
    ProviderScope(child: AppFactoryApp(router: router)),
  );
}
