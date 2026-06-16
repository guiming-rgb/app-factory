/**
 * 合规页面生成 — 根据 AppSpec.complianceFlags 条件性生成隐私/合规 UI
 *
 * 依赖：flutter/material.dart（无额外 package）
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

/** 用户同意书页面（App 首次启动时展示） */
export function emitFlutterConsentPage(displayName: string, flags: Record<string, unknown>): string {
  const name = esc(displayName);
  const hasHIPAA = flags.requiresHIPAA === true;
  const hasGDPR = flags.requiresGDPR === true;
  const hasPIPL = flags.requiresPIPL === true;
  const hasKYC = flags.requiresKYC === true;
  const hasPCI = flags.requiresPCIDSS === true;

  const items: string[] = [];
  if (hasHIPAA) items.push('"健康数据仅用于在您的设备上展示个人健康趋势"');
  if (hasPCI) items.push('"支付信息按照 PCI-DSS 标准加密处理"');
  if (hasKYC) items.push('"身份验证信息仅用于合规身份核验，存储期限遵守监管要求"');
  if (hasGDPR) items.push('"您有权访问、更正和删除您的个人数据（GDPR 第 15-17 条）"');
  if (hasPIPL) items.push('"您的个人信息将按照《个人信息保护法》进行收集和处理"');
  items.push('"我们不会将您的数据出售给第三方"');
  items.push('"您可以随时在设置中撤回授权或申请删除全部数据"');

  const itemLines = items.map((i) => `            _item(${i})`).join(",\n");

  return `import "package:flutter/material.dart";

/// 合规同意书 — 首次启动时展示数据使用声明
class ConsentPage extends StatefulWidget {
  const ConsentPage({super.key});

  @override
  State<ConsentPage> createState() => _ConsentPageState();
}

class _ConsentPageState extends State<ConsentPage> {
  bool _agreed = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("隐私同意书")),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.verified_user, size: 48, color: Colors.teal),
          const SizedBox(height: 16),
          Text(
            "欢迎使用 ${name}",
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            "在使用本应用前，请阅读并同意以下数据使用声明：",
            style: TextStyle(color: Colors.black54, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          const Divider(),
          ${itemLines.length > 0 ? `\n${itemLines},\n` : ""}
          const Divider(),
          const SizedBox(height: 12),
          CheckboxListTile(
            title: const Text("我已阅读并同意以上声明", style: TextStyle(fontSize: 14)),
            value: _agreed,
            onChanged: (v) => setState(() => _agreed = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _agreed ? () => Navigator.of(context).pop(true) : null,
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
            child: const Text("同意并继续"),
          ),
          if (!_agreed)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                "请先勾选同意声明以继续使用",
                style: TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  static Widget _item(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.check_circle_outline, size: 16, color: Colors.teal),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
`;
}

/** 合规信息中心页面（展示所有法规遵从声明 + 数据管理操作） */
export function emitFlutterComplianceHubPage(displayName: string, flags: Record<string, unknown>): string {
  const name = esc(displayName);
  const hasHIPAA = flags.requiresHIPAA === true;
  const hasGDPR = flags.requiresGDPR === true;
  const hasPIPL = flags.requiresPIPL === true;
  const hasKYC = flags.requiresKYC === true;
  const hasPCI = flags.requiresPCIDSS === true;
  const hasDataDel = flags.requiresDataDeletionAPI === true;
  const hasAudit = flags.requiresAuditLog === true;

  const standards: string[] = [];
  if (hasHIPAA) standards.push('const _Standard("HIPAA", "美国健康保险流通与责任法案", Icons.health_and_safety, Colors.blue),');
  if (hasGDPR) standards.push('const _Standard("GDPR", "欧盟通用数据保护条例", Icons.flag, Colors.indigo),');
  if (hasPIPL) standards.push('const _Standard("个人信息保护法", "中国个人信息保护合规", Icons.shield, Colors.orange),');
  if (hasPCI) standards.push('const _Standard("PCI-DSS", "支付卡行业数据安全标准", Icons.payment, Colors.purple),');
  if (hasKYC) standards.push('const _Standard("KYC/AML", "了解你的客户 / 反洗钱", Icons.verified_user, Colors.teal),');

  return `import "package:flutter/material.dart";

/// 合规信息中心 — 展示本 App 遵循的法规标准 + 数据管理操作
class ComplianceHubPage extends StatelessWidget {
  const ComplianceHubPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("隐私与合规")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 数据安全概述
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Icon(Icons.security, size: 48, color: Colors.teal),
                  const SizedBox(height: 8),
                  Text("${name} 数据安全", style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  const Text("您的数据经过加密存储，采用行级安全（RLS）策略隔离", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 遵循标准
          if (${standards.length > 0})
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("遵循的合规标准", style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    ...${standards.length > 0 ? `[\n${standards.join("\n")}\n]` : "[]"}.map((s) => _StandardCard(standard: s)),
                  ],
                ),
              ),
            ),
          if (${standards.length > 0}) const SizedBox(height: 16),

          // 用户权利
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("您的权利", style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  _rightItem(Icons.visibility, "查看收集的数据"),
                  _rightItem(Icons.file_download, "导出数据副本"),
                  ${hasDataDel ? '_rightItem(Icons.delete_forever, "删除全部数据"),' : ''}
                  _rightItem(Icons.settings_backup_restore, "撤回授权"),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 操作按钮
          ${hasDataDel ? `
          OutlinedButton.icon(
            onPressed: () => showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text("删除全部数据"),
                content: const Text("此操作将删除您的账号及所有关联数据，不可撤销。确定继续？"),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text("取消")),
                  FilledButton(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("数据删除请求已提交")));
                    },
                    style: FilledButton.styleFrom(backgroundColor: Colors.red),
                    child: const Text("确认删除"),
                  ),
                ],
              ),
            ),
            icon: const Icon(Icons.delete_forever, color: Colors.red),
            label: const Text("申请删除全部数据", style: TextStyle(color: Colors.red)),
          ),
          ` : ''}
          ${hasAudit ? `const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("审计日志功能请联系管理员"))),
            icon: const Icon(Icons.history, size: 18),
            label: const Text("查看审计日志"),
          ),` : ''}
        ],
      ),
    );
  }

  Widget _rightItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.teal),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

class _Standard {
  final String name;
  final String description;
  final IconData icon;
  final Color color;
  const _Standard(this.name, this.description, this.icon, this.color);
}

class _StandardCard extends StatelessWidget {
  final _Standard standard;
  const _StandardCard({required this.standard});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: standard.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(standard.icon, color: standard.color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(standard.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(standard.description, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
`;
}

/** 根据 complianceFlags 判断是否需要生成合规页面 */
export function shouldGenerateCompliancePages(flags: Record<string, unknown>): boolean {
  return (
    flags.requiresConsentScreen === true ||
    flags.requiresHIPAA === true ||
    flags.requiresPCIDSS === true ||
    flags.requiresGDPR === true ||
    flags.requiresPIPL === true ||
    flags.requiresDataDeletionAPI === true ||
    flags.requiresAuditLog === true ||
    flags.requiresKYC === true
  );
}

/** 合规子页面导入引用（用于集成到 app_router.dart） */
export function compliancePageWidgetRef(flags: Record<string, unknown>): {
  consentImport: string | null;
  hubImport: string | null;
  pages: Array<{ route: string; widget: string }>;
} {
  const pages: Array<{ route: string; widget: string }> = [];

  if (flags.requiresConsentScreen === true) {
    pages.push({ route: "/consent", widget: "ConsentPage" });
  }

  pages.push({ route: "/compliance", widget: "ComplianceHubPage" });

  return {
    consentImport: flags.requiresConsentScreen === true ? "ConsentPage" : null,
    hubImport: "ComplianceHubPage",
    pages,
  };
}
