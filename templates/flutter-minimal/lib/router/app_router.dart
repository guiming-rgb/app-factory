import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../features/match_list/presentation/list_page.dart";
import "../features/profile/presentation/profile_page.dart";

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: "/matches",
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
                  icon: Icon(Icons.sports_soccer),
                  label: "比赛",
                ),
                NavigationDestination(icon: Icon(Icons.person), label: "我的"),
              ],
            ),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "/matches",
                builder: (context, state) => const MatchListPage(),
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
    ],
  );
}
