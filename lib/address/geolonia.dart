import 'dart:convert';

import 'package:http/http.dart' as http;

const geoloniaBase = 'https://japanese-addresses-v2.geoloniamaps.com/api/ja';

class AddressPrefecture {
  const AddressPrefecture({required this.name, required this.cities});

  final String name;
  final List<String> cities;
}

String cityName(Map<String, dynamic> city) {
  return '${_part(city['county'])}${_part(city['city'])}${_part(city['ward'])}';
}

String machiAzaName(Map<String, dynamic> machiAza) {
  return '${_part(machiAza['oaza_cho'])}${_part(machiAza['chome'])}${_part(machiAza['koaza'])}';
}

String _part(Object? value) {
  if (value == null) return '';
  return '$value';
}

List<String> prefectureNames(List<AddressPrefecture> prefs) {
  return prefs.map((pref) => pref.name).toList();
}

List<String> cityNamesFor(List<AddressPrefecture> prefs, String prefecture) {
  for (final pref in prefs) {
    if (pref.name == prefecture) return pref.cities;
  }
  return const [];
}

AddressPrefecture _readPrefecture(Map<String, dynamic> raw) {
  final cities = <String>{};
  final list = raw['cities'];
  if (list is List) {
    for (final item in list) {
      if (item is Map) {
        final name = cityName(Map<String, dynamic>.from(item));
        if (name.isNotEmpty) cities.add(name);
      }
    }
  }
  final names = cities.toList()..sort();
  return AddressPrefecture(name: '${raw['pref'] ?? ''}', cities: names);
}

List<AddressPrefecture> parsePrefectures(Object? json) {
  if (json is! Map) return const [];
  final data = json['data'];
  if (data is! List) return const [];
  return data.whereType<Map>().map((item) => _readPrefecture(Map<String, dynamic>.from(item))).toList();
}

List<String> parseTownNames(Object? json) {
  if (json is! Map) return const [];
  final data = json['data'];
  if (data is! List) return const [];
  final names = <String>{};
  for (final item in data) {
    if (item is! Map) continue;
    final line = machiAzaName(Map<String, dynamic>.from(item)).trim();
    if (line.isNotEmpty) names.add(line);
  }
  final list = names.toList()..sort();
  return list;
}

class GeoloniaClient {
  GeoloniaClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  void close() => _client.close();
  Future<List<AddressPrefecture>>? _prefs;

  Future<List<AddressPrefecture>> prefectures() {
    return _prefs ??= _loadPrefectures();
  }

  Future<List<AddressPrefecture>> _loadPrefectures() async {
    try {
      return parsePrefectures(await _get('$geoloniaBase.json'));
    } catch (error) {
      _prefs = null;
      rethrow;
    }
  }

  Future<List<String>> towns(String prefecture, String city) async {
    final path = '$geoloniaBase/${Uri.encodeComponent(prefecture)}/${Uri.encodeComponent(city)}.json';
    return parseTownNames(await _get(path));
  }

  Future<Object?> _get(String url) async {
    final response = await _client.get(Uri.parse(url));
    if (response.statusCode != 200) {
      throw Exception('住所データの取得に失敗しました (${response.statusCode})');
    }
    return jsonDecode(utf8.decode(response.bodyBytes));
  }
}
