import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Provides internationalized strings for the app.
///
/// Usage:
/// ```dart
/// final i18n = AppLocalizations.of(context)!;
/// print(i18n.translate('common.ok'));               // "OK"
/// print(i18n.translate('auth.login'));               // "Login"
/// print(i18n.translate('industry.finance.budget'));  // "Budget"
/// print(i18n.translate('common.hello', {'name': 'Alice'})); // "Hello, Alice"
/// ```
///
/// To wire up, add to your MaterialApp:
/// ```dart
/// MaterialApp(
///   localizationsDelegates: [AppLocalizations.delegate],
///   supportedLocales: AppLocalizations.supportedLocales,
/// )
/// ```
///
/// JSON translation files are stored under `lib/core/i18n/` and must be
/// declared as assets in `pubspec.yaml`:
/// ```yaml
/// flutter:
///   assets:
///     - lib/core/i18n/en.json
///     - lib/core/i18n/zh.json
///     - lib/core/i18n/zh_TW.json
///     - lib/core/i18n/ja.json
///     - lib/core/i18n/ko.json
/// ```
class AppLocalizations {
  final Locale locale;
  final Map<String, String> _strings = {};
  static final List<Locale> supportedLocales = const [
    Locale('en'),
    Locale('zh'),
    Locale('zh', 'TW'),
    Locale('ja'),
    Locale('ko'),
    Locale('es'),
    Locale('fr'),
    Locale('de'),
    Locale('pt'),
    Locale('ar'),
  ];

  static const String _fallbackLocaleCode = 'en';

  AppLocalizations._(this.locale);

  /// Loads translations for [locale] from the bundled JSON asset.
  ///
  /// Falls back to English if the requested locale file is unavailable or
  /// if [locale] is not in [supportedLocales].
  Future<void> load() async {
    final code = _localeCode(locale);
    try {
      final jsonString = await rootBundle
          .loadString('lib/core/i18n/$code.json');
      final Map<String, dynamic> data = json.decode(jsonString);
      _flatten(data, '');
    } catch (_) {
      // If the requested locale fails, try the fallback.
      if (code != _fallbackLocaleCode) {
        try {
          final fallback = await rootBundle
              .loadString('lib/core/i18n/$_fallbackLocaleCode.json');
          final Map<String, dynamic> data = json.decode(fallback);
          _flatten(data, '');
        } catch (_) {
          // Silently degrade — _strings stays empty.
        }
      }
    }
  }

  // ---------- Public API ----------

  /// Looks up [key] (dot-separated, e.g. `"common.ok"`) and returns the
  /// translated string.  If [params] is provided, any `{{paramName}}`
  /// placeholders in the value are replaced with the corresponding value.
  ///
  /// Returns [key] itself when the key is not found.
  String translate(String key, [Map<String, dynamic>? params]) {
    final value = _strings[key];
    if (value == null) return key;
    if (params == null || params.isEmpty) return value;
    return _interpolate(value, params);
  }

  /// Returns `true` when [key] exists in the loaded translations.
  bool has(String key) => _strings.containsKey(key);

  /// Build-context shorthand for `Localizations.of<AppLocalizations>`.
  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  /// Delegate that the [MaterialApp] uses to create an [AppLocalizations]
  /// instance per locale.
  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  // ---------- Internals ----------

  /// Converts a [Locale] into its asset-file code:
  ///   Locale('en')      → "en"
  ///   Locale('zh', 'TW') → "zh_TW"
  static String _localeCode(Locale locale) {
    if (locale.countryCode != null && locale.countryCode!.isNotEmpty) {
      return '${locale.languageCode}_${locale.countryCode}';
    }
    return locale.languageCode;
  }

  /// Recursively flattens a nested JSON map into dot-separated keys.
  ///
  ///   {"a": {"b": "val"}}  →  {"a.b": "val"}
  void _flatten(Map<String, dynamic> map, String prefix) {
    for (final entry in map.entries) {
      final key = prefix.isEmpty ? entry.key : '$prefix.${entry.key}';
      if (entry.value is Map) {
        _flatten(entry.value as Map<String, dynamic>, key);
      } else {
        _strings[key] = entry.value.toString();
      }
    }
  }

  /// Replaces `{{placeholder}}` tokens in [value] with the corresponding
  /// entry from [params].
  static String _interpolate(String value, Map<String, dynamic> params) {
    String result = value;
    for (final entry in params.entries) {
      result = result.replaceAll('{{${entry.key}}}', '${entry.value}');
    }
    return result;
  }
}

// =========================================================================
// Custom LocalizationsDelegate
// =========================================================================

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return AppLocalizations.supportedLocales.any((supported) =>
        supported.languageCode == locale.languageCode &&
        (supported.countryCode == null ||
            supported.countryCode == locale.countryCode));
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    final instance = AppLocalizations._(locale);
    await instance.load();
    return instance;
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;

  @override
  String toString() => 'AppLocalizations.delegate';
}
