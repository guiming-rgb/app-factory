import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../generated/pages/home_page.dart";
import "../features/finance/pages/list_page.dart";
import "../features/profile/presentation/profile_page.dart";
import "../generated/pages/dashboard_view_dashboard_page.dart";
import "../features/auth/presentation/login_page.dart";
import "../features/auth/presentation/register_page.dart";

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: "/home",
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Scaffold(
            body: navigationShell,
            bottomNavigationBar: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: navigationShell.goBranch,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.widgets_outlined),
                  label: "首页",
                ),
                NavigationDestination(
                  icon: Icon(Icons.list_alt),
                  label: "账单",
                ),
                NavigationDestination(
                  icon: Icon(Icons.person),
                  label: "我的",
                ),
              ],
            ),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "/home",
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "/transaction-list",
                builder: (context, state) => const TransactionListPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "/profile",
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
        GoRoute(
          path: "/dashboard-view",
          builder: (context, state) => const DashboardViewDashboardPage(),
        ),
        GoRoute(path: "/login", builder: (_, __) => const LoginPage()),
        GoRoute(path: "/register", builder: (_, __) => const RegisterPage()),
    ],
  );
}
