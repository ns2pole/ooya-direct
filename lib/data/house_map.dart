import '../logic/house.dart';

DateTime? readDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  try {
    final dynamic dated = value;
    final date = dated.toDate();
    if (date is DateTime) return date;
  } catch (_) {}
  return null;
}

String _str(Object? value) => value == null ? '' : '$value';

HousePropertyFields readHousePropertyFields(Map<String, dynamic> data) {
  return HousePropertyFields(
    rent: _str(data['rent']),
    managementFee: _str(data['managementFee']),
    genre: _str(data['genre']),
    depositKeyMoney: _str(data['depositKeyMoney']),
    areaSize: _str(data['areaSize']),
    floorArea: _str(data['floorArea']),
    floors: _str(data['floors']),
    buildingAge: _str(data['buildingAge']),
    referenceUrl: _str(data['referenceUrl']),
  );
}

List<String> legacyPhotoUrlsFromHouse(Map<String, dynamic> data) {
  final urls = <String>[];
  final seen = <String>{};
  void add(Object? raw) {
    if (raw is! String) return;
    final url = raw.trim();
    if (url.isEmpty || seen.contains(url)) return;
    seen.add(url);
    urls.add(url);
  }

  final rawList = data['photoUrls'];
  if (rawList is List) {
    for (final item in rawList) {
      add(item);
    }
  }
  if (urls.isEmpty) add(data['photoUrl']);
  return urls;
}

House mapHouse(String id, Map<String, dynamic> data) {
  return House(
    id: id,
    ownerId: _str(data['ownerId']),
    title: _str(data['title']),
    description: _str(data['description']),
    coverPhotoUrl: _coverPhotoUrl(data),
    prefecture: _str(data['prefecture']),
    city: _str(data['city']),
    town: _str(data['town']),
    fields: readHousePropertyFields(data),
    landlordId: _str(data['landlordId']),
    sourceId: _str(data['sourceId']),
    fromSync: data['fromSync'] == true,
    hidden: data['hidden'] == true,
    createdAt: readDate(data['createdAt']),
    updatedAt: readDate(data['updatedAt']),
  );
}

HousePhoto mapHousePhoto(String id, Map<String, dynamic> data) {
  final rawOrder = data['order'];
  final order = rawOrder is num && rawOrder.isFinite ? rawOrder.toInt() : 0;
  final rawLabel = data['label'];
  final labelText = rawLabel == null ? '' : '$rawLabel'.trim();
  return HousePhoto(
    id: id,
    url: _str(data['url']),
    order: order,
    label: labelText.isEmpty ? null : labelText,
    createdAt: readDate(data['createdAt']),
  );
}

String? _coverPhotoUrl(Map<String, dynamic> data) {
  final cover = data['coverPhotoUrl'];
  if (cover is String && cover.trim().isNotEmpty) return cover.trim();
  final legacy = legacyPhotoUrlsFromHouse(data);
  return legacy.isEmpty ? null : legacy.first;
}
