import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { pascalCase } from "./dart-emit";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

/** 使用 industry-game 模板（Flame SimpleGame） */
export function emitFlutterIndustryGamePage(
  screen: AppSpecScreen,
  _spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}GamePage`;
  const title = esc(screen.title);
  return `import "package:flutter/material.dart";
import "package:flame/game.dart";

import "../../../features/game/services/game_service.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    final game = SimpleGame();
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: GameWidget(
        game: game,
        overlayBuilderMap: {
          "GameOver": (ctx, g) {
            final simple = g as SimpleGame;
            return Center(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text("游戏结束", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        simple.overlays.remove("GameOver");
                        simple.resumeEngine();
                      },
                      child: const Text("再来一局"),
                    ),
                  ]),
                ),
              ),
            );
          },
        },
      ),
    );
  }
}
`;
}

/** 使用 industry-payment 模板（PaymentService） */
export function emitFlutterIndustryPaymentPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}CheckoutPage`;
  const title = esc(screen.title);
  const appName = esc(spec.displayName);
  return `import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/supabase/supabase_client.dart";
import "../../../features/payment/services/payment_service.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final _amountCtrl = TextEditingController(text: "9.9");
  String _method = "stripe";
  bool _loading = false;
  String? _message;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    final client = supabaseOrNull;
    if (client == null) {
      setState(() => _message = "未配置 Supabase");
      return;
    }
    final amount = double.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _message = "请输入有效金额");
      return;
    }
    setState(() { _loading = true; _message = null; });
    try {
      final service = PaymentService(client);
      final result = await service.pay(
        amount: amount,
        method: _method,
        description: "${appName} · ${title}",
      );
      setState(() {
        _loading = false;
        if (result.success) {
          _message = "支付成功";
        } else if (result.pending) {
          _message = "预下单成功，请在收银台完成支付";
        } else {
          _message = result.message ?? "支付未完成";
        }
      });
    } catch (e) {
      setState(() { _loading = false; _message = "支付失败"; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("${title}")),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _amountCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: "金额 (CNY)", prefixText: "¥ "),
          ),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: "stripe", label: Text("Stripe")),
              ButtonSegment(value: "wechat", label: Text("微信")),
            ],
            selected: {_method},
            onSelectionChanged: (s) => setState(() => _method = s.first),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _loading ? null : _pay,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text("确认支付"),
          ),
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
          ],
          const SizedBox(height: 24),
          const Text(
            "需配置 Supabase Edge Functions: stripe-create-payment-intent / wechat-create-order",
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
`;
}
