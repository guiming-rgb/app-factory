import "package:flutter/material.dart";

import "../../../core/widgets/empty_state.dart";

class MatchListPage extends StatelessWidget {
  const MatchListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("比赛")),
      body: const EmptyState(
        message: "列表页占位。Generator 将按 App Spec 接入 Supabase 查询。",
      ),
    );
  }
}
