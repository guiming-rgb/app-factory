import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

/**
 * Flutter 地图页面生成 — OpenStreetMap (免费无 API Key)
 * 使用 flutter_map + latlong2
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

function pascalCase(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** 地图浏览页 */
export function emitFlutterMapPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = pascalCase(screen.id) + "MapPage";
  const title = esc(screen.title);
  const appName = esc(spec.displayName);

  return `import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:latlong2/latlong.dart";
import "package:geolocator/geolocator.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  LatLng _center = const LatLng(39.9042, 116.4074); // 北京
  List<Marker> _markers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPosition();
  }

  Future<void> _loadPosition() async {
    try {
      final hasPermission = await Geolocator.checkPermission();
      if (hasPermission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      final userLoc = LatLng(position.latitude, position.longitude);
      setState(() {
        _center = userLoc;
        _markers = [
          Marker(
            point: userLoc,
            width: 80,
            height: 80,
            child: const Icon(Icons.location_on, color: Colors.red, size: 40),
          ),
        ];
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = "定位失败：\$e"; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : FlutterMap(
                  options: MapOptions(
                    initialCenter: _center,
                    initialZoom: 13.0,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                      userAgentPackageName: "com.appfactory.map",
                    ),
                    MarkerLayer(markers: _markers),
                    const RichAttributionWidget(
                      attributions: [TextSourceAttribution("OpenStreetMap contributors")],
                    ),
                  ],
                ),
    );
  }
}
`;
}

/** 地图标记列表页（从 Supabase 加载点位） */
export function emitFlutterMapListPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = pascalCase(screen.id) + "MapListPage";
  const title = esc(screen.title);

  return `import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:latlong2/latlong.dart";

import "package:supabase_flutter/supabase_flutter.dart";

class _Place {
  final String id;
  final String name;
  final double lat;
  final double lng;
  const _Place({required this.id, required this.name, required this.lat, required this.lng});
}

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  List<_Place> _places = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  Future<void> _loadPlaces() async {
    try {
      final client = Supabase.instance.client;
      final data = await client.from("places").select("id, name, latitude, longitude").limit(50);
      final list = (data as List<dynamic>?) ?? [];
      setState(() {
        _places = list.map((item) {
          final m = item as Map<String, dynamic>;
          return _Place(
            id: m["id"]?.toString() ?? "",
            name: m["name"]?.toString() ?? "—",
            lat: double.tryParse(m["latitude"]?.toString() ?? "") ?? 0,
            lng: double.tryParse(m["longitude"]?.toString() ?? "") ?? 0,
          );
        }).where((p) => p.lat != 0 && p.lng != 0).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final center = _places.isNotEmpty
        ? LatLng(_places.first.lat, _places.first.lng)
        : const LatLng(39.9042, 116.4074);

    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: FlutterMap(
        options: MapOptions(initialCenter: center, initialZoom: 13.0),
        children: [
          TileLayer(
            urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            userAgentPackageName: "com.appfactory.map",
          ),
          MarkerLayer(
            markers: _places.map((p) => Marker(
              point: LatLng(p.lat, p.lng),
              width: 80,
              height: 40,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on, color: Colors.blue, size: 28),
                  Text(p.name, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }
}
`;
}
