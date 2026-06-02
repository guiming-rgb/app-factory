/**
 * 车载系统模板
 * 依赖：OBD-II BLE adapter / CarPlay 授权 / Android Auto
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

// ─── OBD-II 车辆诊断 ───
export function emitFlutterOBD2Diagnostic(): string {
  return `import "package:flutter/material.dart";

/// OBD-II 车辆诊断页面
/// 需要：ELM327 蓝牙 OBD-II 适配器 + BLE 权限
/// 标准 OBD-II PID 命令集
class OBD2Page extends StatefulWidget {
  const OBD2Page({super.key});

  @override
  State<OBD2Page> createState() => _OBD2PageState();
}

class _OBD2PID {
  final String name;
  final String pid;
  final String unit;
  final String formula;
  final IconData icon;
  const _OBD2PID(this.name, this.pid, this.unit, this.formula, this.icon);
}

class _OBD2PageState extends State<OBD2Page> {
  bool _connected = false;
  bool _scanning = false;
  String? _vin;

  // 标准 OBD-II PID 定义
  static const _pids = [
    _OBD2PID("车速", "0D", "km/h", "A", Icons.speed),
    _OBD2PID("发动机转速", "0C", "RPM", "(A*256+B)/4", Icons.settings),
    _OBD2PID("冷却液温度", "05", "°C", "A-40", Icons.thermostat),
    _OBD2PID("燃油油位", "2F", "%", "A*100/255", Icons.local_gas_station),
    _OBD2PID("进气温度", "0F", "°C", "A-40", Icons.ac_unit),
    _OBD2PID("MAF 空气流量", "10", "g/s", "(A*256+B)/100", Icons.air),
    _OBD2PID("节气门位置", "11", "%", "A*100/255", Icons.trending_up),
    _OBD2PID("发动机负荷", "04", "%", "A*100/255", Icons.engineering),
    _OBD2PID("氧传感器电压", "14", "V", "A*0.005", Icons.sensors),
    _OBD2PID("歧管压力", "0B", "kPa", "A", Icons.compress),
  ];

  // 示例读数
  final Map<String, String> _readings = {
    "车速": "62 km/h",
    "发动机转速": "1850 RPM",
    "冷却液温度": "89 °C",
    "燃油油位": "62 %",
    "进气温度": "32 °C",
  };

  Future<void> _scanAndConnect() async {
    setState(() => _scanning = true);
    // TODO: BLE 连接 ELM327 适配器
    // 1. 扫描 BLE 设备（名称通常含 "OBDII" / "ELM327" / "V-LINK"）
    // 2. 连接 → 发送 AT 命令初始化（AT Z, AT SP 0, AT E0）
    // 3. 发送 PID 查询（01 0D → 车速, 01 0C → 转速）
    // 4. 解析返回的 hex 数据 → display
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("OBD-II 诊断需要 ELM327 蓝牙适配器"), backgroundColor: Colors.orange),
      );
      setState(() { _connected = true; _scanning = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("车辆诊断"),
        actions: [
          IconButton(
            icon: Icon(_scanning ? Icons.bluetooth_searching : Icons.bluetooth_connected, color: _connected ? Colors.green : null),
            onPressed: _scanAndConnect,
          ),
        ],
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.2),
        itemCount: _pids.length,
        itemBuilder: (_, i) {
          final pid = _pids[i];
          final value = _readings[pid.name] ?? ("— " + pid.unit.toString());
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(pid.icon, color: Colors.teal, size: 32),
                  const SizedBox(height: 8),
                  Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text(pid.name, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
`;
}

// ─── 车载仪表盘（速度、油量、发动机温度）───
export function emitFlutterCarDashboard(): string {
  return `import "dart:math" as math;
import "package:flutter/material.dart";

/// 车载仪表盘（实时速度 + 油量 + 温度 + 里程）
/// 需要：OBD-II 或 GPS 数据源
class CarDashboardPage extends StatefulWidget {
  const CarDashboardPage({super.key});

  @override
  State<CarDashboardPage> createState() => _CarDashboardPageState();
}

class _CarDashboardPageState extends State<CarDashboardPage> {
  double _speed = 0;     // km/h
  double _rpm = 0;       // RPM
  double _fuel = 75;     // %
  double _temp = 89;     // °C
  double _odometer = 48250; // km

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // 速度表
            Expanded(
              flex: 3,
              child: CustomPaint(
                size: Size.infinite,
                painter: _SpeedGaugePainter(progress: _speed / 200, value: _speed.toInt().toString()),
              ),
            ),
            // 状态栏
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _MiniGauge(label: "转速", value: "\${(_rpm / 1000).toStringAsFixed(1)}k", unit: "RPM", progress: _rpm / 8000, color: Colors.orange),
                    _MiniGauge(label: "油量", value: "\${_fuel.toInt()}", unit: "%", progress: _fuel / 100, color: Colors.green, iconData: Icons.local_gas_station),
                    _MiniGauge(label: "水温", value: "\${_temp.toInt()}", unit: "°C", progress: _temp / 120, color: Colors.blue),
                    _MiniGauge(label: "里程", value: "\${(_odometer / 1000).toStringAsFixed(1)}", unit: "k km", progress: 0.5, color: Colors.grey, iconData: Icons.map),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniGauge extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final double progress;
  final Color color;
  final IconData? iconData;
  const _MiniGauge({required this.label, required this.value, required this.unit, required this.progress, required this.color, this.iconData});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(iconData ?? (label == "转速" ? Icons.settings : Icons.speed), color: color, size: 24),
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(unit, style: const TextStyle(fontSize: 10, color: Colors.white54)),
        const SizedBox(height: 4),
        Container(width: 40, height: 4, decoration: BoxDecoration(borderRadius: BorderRadius.circular(2), color: Colors.white12)),
      ],
    );
  }
}

class _SpeedGaugePainter extends CustomPainter {
  final double progress;
  final String value;
  _SpeedGaugePainter({required this.progress, required this.value});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.7);
    final radius = size.width * 0.35;
    final paint = Paint()..style = PaintingStyle.stroke..strokeWidth = 18..strokeCap = StrokeCap.round;

    // 背景弧
    paint.color = Colors.white12;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), math.pi, math.pi, false, paint);

    // 进度弧
    paint.color = const Color(0xFF00E676);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), math.pi, math.pi * (progress.clamp(0.0, 1.0)), false, paint);

    // 数值
    final tp = TextPainter(text: TextSpan(text: value, style: const TextStyle(color: Colors.white, fontSize: 72, fontWeight: FontWeight.bold)), textDirection: TextDirection.ltr)..layout();
    tp.paint(canvas, Offset(center.dx - tp.width / 2, center.dy - tp.height - 10));

    // 单位
    final up = TextPainter(text: const TextSpan(text: "km/h", style: TextStyle(color: Colors.white38, fontSize: 16)), textDirection: TextDirection.ltr)..layout();
    up.paint(canvas, Offset(center.dx - up.width / 2, center.dy + 10));
  }

  @override
  bool shouldRepaint(covariant _SpeedGaugePainter old) => old.progress != progress;
}
`;
}

// ─── 行程记录仪（GPS 轨迹 + 统计）───
export function emitFlutterTripLogger(): string {
  return `import "package:flutter/material.dart";

/// 行程记录仪
/// 记录每次驾驶的起点、终点、距离、时长、路径
/// 需要：geolocator + Supabase trips 表
class TripLoggerPage extends StatefulWidget {
  const TripLoggerPage({super.key});

  @override
  State<TripLoggerPage> createState() => _TripLoggerPageState();
}

class _Trip {
  final String id;
  final String from;
  final String to;
  final double distanceKm;
  final int durationMin;
  final DateTime date;
  const _Trip({required this.id, required this.from, required this.to, required this.distanceKm, required this.durationMin, required this.date});
}

class _TripLoggerPageState extends State<TripLoggerPage> {
  bool _recording = false;
  final List<_Trip> _history = [
    const _Trip(id: "1", from: "家", to: "公司", distanceKm: 8.5, durationMin: 22, date: null),
    const _Trip(id: "2", from: "公司", to: "超市", distanceKm: 3.2, durationMin: 10, date: null),
    const _Trip(id: "3", from: "超市", to: "家", distanceKm: 5.1, durationMin: 15, date: null),
  ].map((t) => _Trip(id: t.id, from: t.from, to: t.to, distanceKm: t.distanceKm, durationMin: t.durationMin, date: DateTime.now().subtract(Duration(hours: _TripLoggerPageState._history.length)))).toList();

  double get _totalKm => _history.fold(0, (s, t) => s + t.distanceKm);
  int get _totalMin => _history.fold(0, (s, t) => s + t.durationMin);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("行程记录")),
      body: Column(
        children: [
          // 统计卡片
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _StatCard("总行程", "\${_totalKm.toStringAsFixed(1)} km", Icons.map, Colors.teal),
                const SizedBox(width: 12),
                _StatCard("总时长", "\${_formatDuration(_totalMin)}", Icons.timer, Colors.orange),
                const SizedBox(width: 12),
                _StatCard("次数", "\${_history.length}", Icons.repeat, Colors.blue),
              ],
            ),
          ),
          // 历史列表
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _history.length,
              itemBuilder: (_, i) {
                final t = _history[i];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.directions_car, color: Colors.teal),
                    title: Text("\${t.from} → \${t.to}"),
                    subtitle: Text("\${t.distanceKm.toStringAsFixed(1)} km · \${t.durationMin} 分钟 · \${_formatDate(t.date)}"),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          setState(() => _recording = !_recording);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(_recording ? "开始记录行程…" : "行程记录需要 GPS 权限和 geolocator"), backgroundColor: Colors.teal),
          );
        },
        icon: Icon(_recording ? Icons.stop : Icons.fiber_manual_record, color: _recording ? Colors.red : null),
        label: Text(_recording ? "停止记录" : "开始记录"),
      ),
    );
  }

  String _formatDuration(int min) => min >= 60 ? "\${min ~/ 60}h\${min % 60}m" : "\${min}m";
  String _formatDate(DateTime d) => "\${d.month}/\${d.day} \${d.hour}:\${d.minute.toString().padLeft(2, '0')}";
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 4),
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

// ─── CarPlay / Android Auto 脚手架 ───
export function emitFlutterCarPlayScaffold(): string {
  return `import "package:flutter/material.dart";

/// CarPlay / Android Auto 脚手架
/// 需要：flutter_carplay (iOS) / android_auto (Android) + Apple MFi 认证
class CarPlaySetupPage extends StatelessWidget {
  const CarPlaySetupPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("车载投屏")),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.phone_android, size: 64, color: Colors.teal),
          const SizedBox(height: 16),
          const Text("CarPlay / Android Auto", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          _setupStep("1", "Apple CarPlay 集成", "需要 Apple MFi 认证 + Xcode Capability (com.apple.developer.carplay)\n使用 flutter_carplay 包构建车机 UI"),
          _setupStep("2", "Android Auto 集成", "需要 Google Play Console 注册 + AndroidManifest 声明\n使用 android_auto 或 Android for Cars App Library"),
          _setupStep("3", "车机 UI 适配", "App 需要提供简化的驾驶模式界面：\n• 大字体 + 高对比度\n• 语音控制\n• 禁止视频播放\n• 单手操作优化"),
          _setupStep("4", "合规要求", "NHTSA 驾驶分心指南：\n• 单次操作 ≤ 2 秒\n• 行驶时禁用文本输入\n• 视频仅限驻车状态"),
          const SizedBox(height: 16),
          const Divider(),
          const Text("当前设备支持状态", style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text("• iOS ≥ 14 + 车载 CarPlay → flutter_carplay 激活"),
          const Text("• Android ≥ 12 + 车载 Android Auto → android_auto 激活"),
          const SizedBox(height: 8),
          const Text("⚠ CarPlay/Android Auto 需要硬件 + 认证，在真实车载环境下测试", style: TextStyle(color: Colors.orange, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _setupStep(String num, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(radius: 14, child: Text(num, style: const TextStyle(fontSize: 14))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Text(desc, style: const TextStyle(color: Colors.black87, height: 1.5, fontSize: 13)),
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
