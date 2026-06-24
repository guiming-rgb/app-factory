import "package:supabase_flutter/supabase_flutter.dart";

/// 天气服务 — 城市管理、实时天气、逐时/逐日预报、AQI 空气质量、生活指数
///
/// 实时天气数据通过 [fetchWeather] 从 Open-Meteo 免费 API 获取（无需 Key），
/// 城市收藏列表通过 Supabase 持久化。
class WeatherService {
  final SupabaseClient _client;
  WeatherService(this._client);

  // ─── 城市管理 ────────────────────────────────

  /// 获取当前用户收藏的城市列表
  Future<List<Map<String, dynamic>>> getFavoriteCities() async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("cities")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", ascending: false);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 添加城市到收藏
  Future<Map<String, dynamic>?> addCity({
    required String name,
    required double lat,
    required double lon,
    String? country,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("cities")
          .insert({
            'user_id': uid,
            'name': name,
            'lat': lat,
            'lon': lon,
            'country': country,
          })
          .select()
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 从收藏中移除城市
  Future<bool> removeCity(String cityId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("cities")
          .delete()
          .eq("id", cityId)
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 设为当前默认城市
  Future<bool> setCurrentCity(String cityId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      // 清除其他城市的 current 标记
      await _client
          .from("cities")
          .update({'is_current': false})
          .eq("user_id", uid);
      // 设置当前城市
      await _client
          .from("cities")
          .update({'is_current': true})
          .eq("id", cityId)
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取当前选中的城市
  Future<Map<String, dynamic>?> getCurrentCity() async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("cities")
          .select("*")
          .eq("user_id", uid)
          .eq("is_current", true)
          .maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 实时天气 ────────────────────────────────

  /// 从 Open-Meteo 获取实时天气数据（无需 API Key）
  static Future<Map<String, dynamic>?> fetchWeather(double lat, double lon) async {
    try {
      final uri = Uri.parse(
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=$lat&longitude=$lon"
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        "wind_speed_10m,wind_direction_10m,weather_code,precipitation,"
        "pressure_msl,cloud_cover,uv_index,visibility"
        "&timezone=auto"
        "&forecast_days=3",
      );
      final r = await Supabase.instance.client.httpClient.get(uri);
      if (r.statusCode == 200) return r.data as Map<String, dynamic>;
    } catch (_) {
      // 静默失败，调用方处理 null
    }
    return null;
  }

  /// 根据天气代码获取文字描述（WMO Weather Code）
  static String weatherCodeToString(int code) {
    const codes = {
      0: '晴天', 1: '大部晴', 2: '局部多云', 3: '多云',
      45: '雾', 48: '雾凇',
      51: '小毛毛雨', 53: '中毛毛雨', 55: '大毛毛雨',
      56: '冻毛毛雨', 57: '冻毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      66: '冻雨', 67: '冻雨',
      71: '小雪', 73: '中雪', 75: '大雪',
      77: '雪粒',
      80: '小阵雨', 81: '中阵雨', 82: '大阵雨',
      85: '小阵雪', 86: '大阵雪',
      95: '雷暴', 96: '雷暴伴小冰雹', 99: '雷暴伴大冰雹',
    };
    return codes[code] ?? '未知';
  }

  // ─── 逐时 / 逐日预报 ────────────────────────

  /// 获取每小时预报（当日及未来）
  static Future<List<Map<String, dynamic>>?> fetchHourlyForecast(
    double lat, double lon, {
    int days = 3,
  }) async {
    try {
      final uri = Uri.parse(
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=$lat&longitude=$lon"
        "&hourly=temperature_2m,precipitation_probability,weather_code,"
        "wind_speed_10m,relative_humidity_2m,uv_index"
        "&timezone=auto"
        "&forecast_days=$days",
      );
      final r = await Supabase.instance.client.httpClient.get(uri);
      if (r.statusCode != 200) return null;
      final data = r.data as Map<String, dynamic>;
      final hourly = data['hourly'] as Map<String, dynamic>?;
      if (hourly == null) return null;
      final times = (hourly['time'] as List?)?.cast<String>() ?? [];
      final temps = (hourly['temperature_2m'] as List?)?.cast<num>() ?? [];
      final probs = (hourly['precipitation_probability'] as List?)?.cast<num>() ?? [];
      final codes = (hourly['weather_code'] as List?)?.cast<num>() ?? [];
      final winds = (hourly['wind_speed_10m'] as List?)?.cast<num>() ?? [];
      final result = <Map<String, dynamic>>[];
      for (var i = 0; i < times.length; i++) {
        result.add({
          'time': times[i],
          'temperature': temps.length > i ? temps[i].toDouble() : null,
          'precipitation_probability': probs.length > i ? probs[i].toDouble() : null,
          'weather_code': codes.length > i ? codes[i].toInt() : null,
          'wind_speed': winds.length > i ? winds[i].toDouble() : null,
        });
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  /// 获取每日预报
  static Future<List<Map<String, dynamic>>?> fetchDailyForecast(
    double lat, double lon, {
    int days = 7,
  }) async {
    try {
      final uri = Uri.parse(
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=$lat&longitude=$lon"
        "&daily=temperature_2m_max,temperature_2m_min,weather_code,"
        "precipitation_sum,wind_speed_10m_max,uv_index_max,"
        "sunrise,sunset"
        "&timezone=auto"
        "&forecast_days=$days",
      );
      final r = await Supabase.instance.client.httpClient.get(uri);
      if (r.statusCode != 200) return null;
      final data = r.data as Map<String, dynamic>;
      final daily = data['daily'] as Map<String, dynamic>?;
      if (daily == null) return null;
      final dates = (daily['time'] as List?)?.cast<String>() ?? [];
      final maxTemps = (daily['temperature_2m_max'] as List?)?.cast<num>() ?? [];
      final minTemps = (daily['temperature_2m_min'] as List?)?.cast<num>() ?? [];
      final codes = (daily['weather_code'] as List?)?.cast<num>() ?? [];
      final precip = (daily['precipitation_sum'] as List?)?.cast<num>() ?? [];
      final wind = (daily['wind_speed_10m_max'] as List?)?.cast<num>() ?? [];
      final uv = (daily['uv_index_max'] as List?)?.cast<num>() ?? [];
      final result = <Map<String, dynamic>>[];
      for (var i = 0; i < dates.length; i++) {
        result.add({
          'date': dates[i],
          'temp_max': maxTemps.length > i ? maxTemps[i].toDouble() : null,
          'temp_min': minTemps.length > i ? minTemps[i].toDouble() : null,
          'weather_code': codes.length > i ? codes[i].toInt() : null,
          'precipitation': precip.length > i ? precip[i].toDouble() : null,
          'wind_speed': wind.length > i ? wind[i].toDouble() : null,
          'uv_index': uv.length > i ? uv[i].toDouble() : null,
        });
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  // ─── AQI 空气质量 ────────────────────────────

  /// 从 Open-Meteo Air Quality API 获取 AQI 数据
  static Future<Map<String, dynamic>?> fetchAQI(double lat, double lon) async {
    try {
      final uri = Uri.parse(
        "https://air-quality-api.open-meteo.com/v1/air-quality"
        "?latitude=$lat&longitude=$lon"
        "&current=european_aqi,us_aqi,pm2_5,pm10,"
        "nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide"
        "&timezone=auto",
      );
      final r = await Supabase.instance.client.httpClient.get(uri);
      if (r.statusCode == 200) return r.data as Map<String, dynamic>;
    } catch (_) {
      // 静默失败
    }
    return null;
  }

  /// AQI 级别文字描述
  static String aqiLevel(int aqi) {
    if (aqi <= 50) return '优';
    if (aqi <= 100) return '良';
    if (aqi <= 150) return '轻度污染';
    if (aqi <= 200) return '中度污染';
    if (aqi <= 300) return '重度污染';
    return '严重污染';
  }

  // ─── 生活指数 ────────────────────────────────

  /// 获取生活指数（日出日落、穿衣建议、紫外线等）
  ///
  /// 主要通过 Open-Meteo 相关数据推算，后续可对接第三方生活指数 API。
  static Future<Map<String, dynamic>?> fetchLifeIndices(double lat, double lon) async {
    try {
      final uri = Uri.parse(
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=$lat&longitude=$lon"
        "&daily=uv_index_max,precipitation_sum,wind_speed_10m_max,"
        "sunrise,sunset,daylight_duration"
        "&current=uv_index,precipitation,cloud_cover"
        "&timezone=auto"
        "&forecast_days=1",
      );
      final r = await Supabase.instance.client.httpClient.get(uri);
      if (r.statusCode != 200) return null;
      final data = r.data as Map<String, dynamic>;
      final current = data['current'] as Map<String, dynamic>? ?? {};
      final daily = (data['daily'] as Map<String, dynamic>?) ?? {};

      // 简单推算生活指数
      final cloudCover = (current['cloud_cover'] as num?)?.toDouble() ?? 0;
      final uv = (current['uv_index'] as num?)?.toDouble() ?? 0;
      final precip = (current['precipitation'] as num?)?.toDouble() ?? 0;
      final wind = ((daily['wind_speed_10m_max'] as List?)?.firstOrNull as num?)?.toDouble() ?? 0;

      final uvLevel = uv < 3 ? '弱' : (uv < 6 ? '中等' : (uv < 8 ? '强' : '很强'));
      final comfortLevel = precip > 5
          ? '有降水，建议室内活动'
          : (wind > 40
              ? '风较大，注意防风'
              : (cloudCover > 70 ? '阴天，体感偏凉' : '天气良好，适宜户外'));

      return {
        'uv_index': uv,
        'uv_level': uvLevel,
        'comfort': comfortLevel,
        'sunrise': ((daily['sunrise'] as List?)?.firstOrNull as String?) ?? '',
        'sunset': ((daily['sunset'] as List?)?.firstOrNull as String?) ?? '',
        'daylight_duration': ((daily['daylight_duration'] as List?)?.firstOrNull as num?)?.toDouble() ?? 0,
        'cloud_cover': cloudCover,
        'precipitation': precip,
        'wind_speed': wind,
      };
    } catch (_) {
      return null;
    }
  }
}
