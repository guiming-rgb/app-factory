import "package:supabase_flutter/supabase_flutter.dart";

class WeatherService {
  final SupabaseClient _c; WeatherService(this._c);
  /// 第三方 API: Open-Meteo 免费天气 (无需 key)
  static Future<Map<String,dynamic>?> fetchWeather(double lat,double lon) async {
    try {
      final uri=Uri.parse("https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3");
      final r=await Supabase.instance.client.httpClient.get(uri);
      if(r.statusCode==200) return r.data as Map<String,dynamic>;
    }catch(_){}
    return null;
  }
  Future<List<Map<String,dynamic>>> getFavoriteCities() async => ((await _c.from("cities").select("*").eq("user_id",_c.auth.currentUser!.id)) as List).cast<Map<String,dynamic>>();
  Future<void> addCity({required String name,required double lat,required double lon}) async {
    await _c.from("cities").insert({'user_id':_c.auth.currentUser!.id,'name':name,'lat':lat,'lon':lon});
  }
}