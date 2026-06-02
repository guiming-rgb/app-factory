/**
 * 医疗设备 + 健康数据 模板
 * 依赖：health_kit_reporter (iOS) / health (Android) + BLE 医疗器械 SDK
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

// ─── 健康数据仪表盘（HealthKit / Google Fit 数据聚合）───
export function emitFlutterHealthDashboard(displayName: string): string {
  const name = esc(displayName);
  return `import "package:flutter/material.dart";

/// 健康数据仪表盘
/// 需要：iOS HealthKit 权限 / Android Google Fit API + health 包
class HealthDashboardPage extends StatefulWidget {
  const HealthDashboardPage({super.key});

  @override
  State<HealthDashboardPage> createState() => _HealthDashboardPageState();
}

class _HealthDashboardPageState extends State<HealthDashboardPage> {
  bool _authorized = false;
  bool _loading = true;

  // 示例健康数据
  final _metrics = <_HealthMetric>[
    const _HealthMetric("步数", "8,432", "步", Icons.directions_walk, Colors.blue),
    const _HealthMetric("心率", "72", "bpm", Icons.favorite, Colors.red),
    const _HealthMetric("睡眠", "7.5", "小时", Icons.bed, Colors.indigo),
    const _HealthMetric("血氧", "98", "%", Icons.bloodtype, Colors.orange),
    const _HealthMetric("体重", "68.5", "kg", Icons.monitor_weight, Colors.green),
    const _HealthMetric("血压", "120/80", "mmHg", Icons.speed, Colors.purple),
  ];

  @override
  void initState() {
    super.initState();
    _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    // TODO: 请求 HealthKit (iOS) 或 Google Fit (Android) 权限
    // iOS: HKHealthStore.requestAuthorization
    // Android: GoogleSignIn.hasPermissions + FitnessOptions
    setState(() { _authorized = false; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("健康数据"),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () => _requestPermissions(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : !_authorized
              ? _buildPermissionPrompt()
              : _buildDashboard(),
    );
  }

  Widget _buildPermissionPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.health_and_safety, size: 64, color: Colors.teal),
            const SizedBox(height: 16),
            const Text("需要健康数据权限", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              "${name} 需要访问 HealthKit (iOS) 或 Google Fit (Android) 以读取健康数据。\n\n"
              "数据仅存储在本地，不会上传到云端。",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _requestPermissions,
              icon: const Icon(Icons.health_and_safety),
              label: const Text("授权健康数据"),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => setState(() => _authorized = true),
              child: const Text("跳过（演示模式）"),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.1,
      ),
      itemCount: _metrics.length,
      itemBuilder: (_, i) {
        final m = _metrics[i];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(m.icon, color: m.color, size: 36),
                const SizedBox(height: 8),
                Text(m.value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                Text(m.unit, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text(m.name, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _HealthMetric {
  final String name;
  final String value;
  final String unit;
  final IconData icon;
  final Color color;
  const _HealthMetric(this.name, this.value, this.unit, this.icon, this.color);
}
`;
}

// ─── BLE 医疗器械连接（血压计、血糖仪等）───
export function emitFlutterMedicalBLEDevice(): string {
  return `import "package:flutter/material.dart";

/// BLE 医疗器械扫描与连接
/// 支持：血压计、血糖仪、体温计、血氧仪、体重秤等标准 BLE Health 设备
/// 依赖：flutter_blue_plus + 设备 GATT Service UUID
class MedicalDevicePage extends StatefulWidget {
  const MedicalDevicePage({super.key});

  @override
  State<MedicalDevicePage> createState() => _MedicalDevicePageState();
}

// 标准 BLE Health Device Service UUIDs
class BleHealthServices {
  static const bloodPressure = "00001810-0000-1000-8000-00805f9b34fb";
  static const glucose = "00001808-0000-1000-8000-00805f9b34fb";
  static const thermometer = "00001809-0000-1000-8000-00805f9b34fb";
  static const pulseOximeter = "00001822-0000-1000-8000-00805f9b34fb";
  static const weightScale = "0000181d-0000-1000-8000-00805f9b34fb";
  static const heartRate = "0000180d-0000-1000-8000-00805f9b34fb";

  static String deviceTypeName(String uuid) {
    switch (uuid) {
      case bloodPressure: return "血压计";
      case glucose: return "血糖仪";
      case thermometer: return "体温计";
      case pulseOximeter: return "血氧仪";
      case weightScale: return "体重秤";
      case heartRate: return "心率带";
      default: return "医疗设备";
    }
  }
}

class _DeviceReading {
  final String deviceName;
  final String deviceType;
  final String value;
  final String unit;
  final DateTime timestamp;
  const _DeviceReading({required this.deviceName, required this.deviceType, required this.value, required this.unit, required this.timestamp});
}

class _MedicalDevicePageState extends State<MedicalDevicePage> {
  bool _scanning = false;
  final List<_DeviceReading> _readings = [];
  String? _connectedDevice;

  @override
  void initState() {
    super.initState();
    // 示例读数
    _readings.addAll([
      const _DeviceReading(deviceName: "血压计 A", deviceType: "血压计", value: "118/76", unit: "mmHg", timestamp: null),
      const _DeviceReading(deviceName: "血糖仪 B", deviceType: "血糖仪", value: "5.4", unit: "mmol/L", timestamp: null),
    ].map((r) => _DeviceReading(deviceName: r.deviceName, deviceType: r.deviceType, value: r.value, unit: r.unit, timestamp: DateTime.now().subtract(const Duration(minutes: 5))))));
  }

  Future<void> _startScan() async {
    setState(() => _scanning = true);
    // TODO: 替换为真实 BLE 扫描
    // final devices = await FlutterBluePlus.instance.startScan(timeout: const Duration(seconds: 10));
    // 过滤出健康设备 UUID (BleHealthServices.*)
    // 连接 → 订阅 characteristic → 解析 IEEE 11073 数据格式 → 展示读数
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("BLE 医疗器械扫描需要 flutter_blue_plus + 真实硬件"), backgroundColor: Colors.orange),
      );
      setState(() => _scanning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_connectedDevice ?? "医疗设备"),
        actions: [
          IconButton(
            icon: Icon(_scanning ? Icons.bluetooth_searching : Icons.bluetooth),
            onPressed: _startScan,
          ),
        ],
      ),
      body: _readings.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.medical_services, size: 64, color: Colors.grey),
                  const SizedBox(height: 12),
                  const Text("点击蓝牙图标扫描医疗设备"),
                  const SizedBox(height: 8),
                  const Text("支持：血压计 · 血糖仪 · 体温计 · 血氧仪 · 体重秤", style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _readings.length,
              itemBuilder: (_, i) {
                final r = _readings[i];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.monitor_heart, color: Colors.red),
                    title: Text("\${r.deviceType}: \${r.value} \${r.unit}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    subtitle: Text("\${r.deviceName} · \${_formatTime(r.timestamp)}"),
                  ),
                );
              },
            ),
    );
  }

  String _formatTime(DateTime t) {
    final d = t ?? DateTime.now();
    return "\${d.hour.toString().padLeft(2, '0')}:\${d.minute.toString().padLeft(2, '0')}";
  }
}
`;
}

// ─── 用药提醒系统 ───
export function emitFlutterMedicationReminder(): string {
  return `import "package:flutter/material.dart";

/// 用药提醒 + 服药记录
/// 支持本地通知 + 时间表 + 历史记录
class MedicationPage extends StatefulWidget {
  const MedicationPage({super.key});

  @override
  State<MedicationPage> createState() => _MedicationPageState();
}

class _Medication {
  final String id;
  final String name;
  final String dosage;
  final TimeOfDay time;
  final bool taken;
  const _Medication({required this.id, required this.name, required this.dosage, required this.time, this.taken = false});
}

class _MedicationPageState extends State<MedicationPage> {
  final List<_Medication> _meds = [
    const _Medication(id: "1", name: "阿司匹林", dosage: "100mg × 1片", time: TimeOfDay(hour: 8, minute: 0)),
    const _Medication(id: "2", name: "维生素 D", dosage: "400IU × 1粒", time: TimeOfDay(hour: 12, minute: 0)),
    const _Medication(id: "3", name: "降压药", dosage: "5mg × 1片", time: TimeOfDay(hour: 20, minute: 0)),
  ];

  void _toggleTaken(int index) {
    setState(() {
      final m = _meds[index];
      _meds[index] = _Medication(id: m.id, name: m.name, dosage: m.dosage, time: m.time, taken: !m.taken);
    });
    // TODO: 保存到本地存储 + 上报到 Supabase medication_logs 表
  }

  Future<void> _addMedication() async {
    final nameController = TextEditingController();
    final dosageController = TextEditingController();
    TimeOfDay? selectedTime = const TimeOfDay(hour: 8, minute: 0);

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text("添加用药"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: "药品名称")),
              TextField(controller: dosageController, decoration: const InputDecoration(labelText: "剂量（如 100mg×1片）")),
              const SizedBox(height: 12),
              ListTile(
                title: Text("时间: \${selectedTime!.format(ctx)}"),
                trailing: const Icon(Icons.access_time),
                onTap: () async {
                  final t = await showTimePicker(context: ctx, initialTime: selectedTime!);
                  if (t != null) setDialogState(() => selectedTime = t);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("取消")),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("添加")),
          ],
        ),
      ),
    );

    if (result == true && nameController.text.isNotEmpty) {
      setState(() => _meds.add(_Medication(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: nameController.text, dosage: dosageController.text, time: selectedTime!,
      )));
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = TimeOfDay.now();
    // 按时间排序，到点的优先
    final sorted = [..._meds]..sort((a, b) {
      final aDue = _isDue(a, now) ? 0 : 1;
      final bDue = _isDue(b, now) ? 0 : 1;
      if (aDue != bDue) return aDue - bDue;
      return a.time.hour * 60 + a.time.minute - (b.time.hour * 60 + b.time.minute);
    });

    return Scaffold(
      appBar: AppBar(title: const Text("用药提醒")),
      body: sorted.isEmpty
          ? const Center(child: Text("暂无用药计划"))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: sorted.length,
              itemBuilder: (_, i) {
                final med = sorted[i];
                final due = _isDue(med, now) && !med.taken;
                return Card(
                  color: due ? Colors.orange.shade50 : null,
                  child: ListTile(
                    leading: Icon(med.taken ? Icons.check_circle : (due ? Icons.notification_important : Icons.medication), color: med.taken ? Colors.green : (due ? Colors.orange : Colors.grey)),
                    title: Text(med.name, style: TextStyle(fontWeight: FontWeight.bold, decoration: med.taken ? TextDecoration.lineThrough : null)),
                    subtitle: Text("\${med.dosage} · \${med.time.format(context)}"),
                    trailing: med.taken
                        ? TextButton(onPressed: () => _toggleTaken(i), child: const Text("撤销"))
                        : FilledButton(onPressed: () => _toggleTaken(i), child: const Text("已服")),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(onPressed: _addMedication, child: const Icon(Icons.add)),
    );
  }

  bool _isDue(_Medication med, TimeOfDay now) {
    return med.time.hour == now.hour && med.time.minute <= now.minute;
  }
}
`;
}

// ─── HIPAA / 数据安全合规提示页 ───
export function emitFlutterHIPAACompliance(): string {
  return `import "package:flutter/material.dart";

/// HIPAA / 个人信息保护法 合规提示
/// 医疗 App 必须展示隐私政策 + 数据使用说明
class HIPAACompliancePage extends StatefulWidget {
  const HIPAACompliancePage({super.key});

  @override
  State<HIPAACompliancePage> createState() => _HIPAACompliancePageState();
}

class _HIPAACompliancePageState extends State<HIPAACompliancePage> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("隐私与数据安全")),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.security, size: 48, color: Colors.teal),
          const SizedBox(height: 16),
          const Text("健康数据隐私声明", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _section("1. 数据收集", "本应用可能收集以下健康数据：心率、血压、血糖、步数、睡眠、体重等。这些数据来自 HealthKit（iOS）或 Google Fit（Android），或通过 BLE 医疗设备采集。"),
          _section("2. 数据使用", "健康数据仅用于在您的设备上展示个人健康趋势。未经明确授权，不会上传至云端或与第三方共享。"),
          _section("3. 数据存储", "数据默认存储于设备本地。如需云端备份，数据将经过端到端加密后存储于 Supabase（PostgreSQL + RLS 行级安全）。"),
          _section("4. 合规标准", "本应用遵循：\n• HIPAA (美国健康保险流通与责任法案)\n• GDPR (欧盟通用数据保护条例)\n• 《个人信息保护法》(中国)"),
          _section("5. 用户权利", "您有权随时：查看收集的数据、导出数据副本、删除全部数据、撤回授权。"),
          const SizedBox(height: 24),
          const Divider(),
          CheckboxListTile(
            title: const Text("我已阅读并同意隐私声明"),
            value: _accepted,
            onChanged: (v) => setState(() => _accepted = v ?? false),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _accepted ? () => Navigator.of(context).pop(true) : null,
            child: const Text("同意并继续"),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 4),
          Text(body, style: const TextStyle(color: Colors.black87, height: 1.5)),
        ],
      ),
    );
  }
}
`;
}

/** 医疗 App 完整页面包（含所有子页面） */
export function emitFlutterMedicalFullApp(displayName: string): string {
  return emitFlutterHealthDashboard(displayName) + "\n\n" +
         emitFlutterMedicalBLEDevice() + "\n\n" +
         emitFlutterMedicationReminder() + "\n\n" +
         emitFlutterHIPAACompliance();
}
