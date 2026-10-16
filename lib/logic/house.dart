class HousePropertyFields {
  const HousePropertyFields({
    this.rent = '',
    this.managementFee = '',
    this.genre = '',
    this.depositKeyMoney = '',
    this.areaSize = '',
    this.floorArea = '',
    this.floors = '',
    this.buildingAge = '',
    this.referenceUrl = '',
  });

  final String rent;
  final String managementFee;
  final String genre;
  final String depositKeyMoney;
  final String areaSize;
  final String floorArea;
  final String floors;
  final String buildingAge;
  final String referenceUrl;

  static const empty = HousePropertyFields();

  static const keys = [
    'rent',
    'managementFee',
    'genre',
    'depositKeyMoney',
    'areaSize',
    'floorArea',
    'floors',
    'buildingAge',
    'referenceUrl',
  ];

  String operator [](String key) => switch (key) {
        'rent' => rent,
        'managementFee' => managementFee,
        'genre' => genre,
        'depositKeyMoney' => depositKeyMoney,
        'areaSize' => areaSize,
        'floorArea' => floorArea,
        'floors' => floors,
        'buildingAge' => buildingAge,
        'referenceUrl' => referenceUrl,
        _ => '',
      };

  HousePropertyFields copyWith({
    String? rent,
    String? managementFee,
    String? genre,
    String? depositKeyMoney,
    String? areaSize,
    String? floorArea,
    String? floors,
    String? buildingAge,
    String? referenceUrl,
  }) {
    return HousePropertyFields(
      rent: rent ?? this.rent,
      managementFee: managementFee ?? this.managementFee,
      genre: genre ?? this.genre,
      depositKeyMoney: depositKeyMoney ?? this.depositKeyMoney,
      areaSize: areaSize ?? this.areaSize,
      floorArea: floorArea ?? this.floorArea,
      floors: floors ?? this.floors,
      buildingAge: buildingAge ?? this.buildingAge,
      referenceUrl: referenceUrl ?? this.referenceUrl,
    );
  }

  Map<String, String> toPayload() {
    return {
      'rent': rent.trim(),
      'managementFee': managementFee.trim(),
      'genre': genre.trim(),
      'depositKeyMoney': depositKeyMoney.trim(),
      'areaSize': areaSize.trim(),
      'floorArea': floorArea.trim(),
      'floors': floors.trim(),
      'buildingAge': buildingAge.trim(),
      'referenceUrl': referenceUrl.trim(),
    };
  }
}

const areaSizeOptions = [
  '1R',
  '1K',
  '1DK',
  '1LDK',
  '1SLDK',
  '2K',
  '2DK',
  '2LDK',
  '2SLDK',
  '3K',
  '3DK',
  '3LDK',
  '3SLDK',
  '4K',
  '4DK',
  '4LDK',
  '4SLDK',
  '5K',
  '5DK',
  '5LDK',
  '5SLDK',
  '6K以上',
  '6LDK以上',
  'その他',
];

const houseGenreOptions = [
  'マンション',
  'アパート',
  '一戸建て',
  'テラスハウス',
  'その他',
];

bool isKnownLayoutAreaSize(String value) => areaSizeOptions.contains(value.trim());

bool isKnownHouseGenre(String value) => houseGenreOptions.contains(value.trim());

class House {
  const House({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.coverPhotoUrl,
    required this.prefecture,
    required this.city,
    required this.town,
    required this.fields,
    required this.landlordId,
    required this.sourceId,
    required this.fromSync,
    required this.hidden,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String ownerId;
  final String title;
  final String description;
  final String? coverPhotoUrl;
  final String prefecture;
  final String city;
  final String town;
  final HousePropertyFields fields;
  final String landlordId;
  final String sourceId;
  final bool fromSync;
  final bool hidden;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get rent => fields.rent;
  String get managementFee => fields.managementFee;
  String get genre => fields.genre;
  String get depositKeyMoney => fields.depositKeyMoney;
  String get areaSize => fields.areaSize;
  String get floorArea => fields.floorArea;
  String get floors => fields.floors;
  String get buildingAge => fields.buildingAge;
  String get referenceUrl => fields.referenceUrl;

  House copyWith({bool? hidden}) {
    return House(
      id: id,
      ownerId: ownerId,
      title: title,
      description: description,
      coverPhotoUrl: coverPhotoUrl,
      prefecture: prefecture,
      city: city,
      town: town,
      fields: fields,
      landlordId: landlordId,
      sourceId: sourceId,
      fromSync: fromSync,
      hidden: hidden ?? this.hidden,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class HousePhoto {
  const HousePhoto({
    required this.id,
    required this.url,
    required this.order,
    required this.label,
    required this.createdAt,
  });

  final String id;
  final String url;
  final int order;
  final String? label;
  final DateTime? createdAt;
}

class DetailRow {
  const DetailRow({required this.label, required this.value, this.href});

  final String label;
  final String value;
  final String? href;

  @override
  bool operator ==(Object other) {
    return other is DetailRow && other.label == label && other.value == value && other.href == href;
  }

  @override
  int get hashCode => Object.hash(label, value, href);
}

class HouseListSummary {
  const HouseListSummary({required this.title, required this.listedDate});

  final String title;
  final String listedDate;

  @override
  bool operator ==(Object other) {
    return other is HouseListSummary && other.title == title && other.listedDate == listedDate;
  }

  @override
  int get hashCode => Object.hash(title, listedDate);
}

const houseListQueryKey = 'house';

String formatDate(DateTime? date) {
  if (date == null) return '—';
  final local = date.toLocal();
  final minute = local.minute.toString().padLeft(2, '0');
  final second = local.second.toString().padLeft(2, '0');
  return '${local.year}/${local.month}/${local.day} ${local.hour}:$minute:$second';
}

String formatDateOnly(DateTime? date) {
  if (date == null) return '—';
  final local = date.toLocal();
  return '${local.year}/${local.month}/${local.day}';
}

String houseLocationLine(House house) {
  return [house.prefecture, house.city, house.town].where((part) => part.trim().isNotEmpty).join(' ');
}

String? hrefForReferenceUrl(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return null;
  if (RegExp(r'^https?://', caseSensitive: false).hasMatch(value)) return value;
  if (value.startsWith('//')) return 'https:$value';
  if (RegExp(r'^[a-z0-9][a-z0-9-]*\.', caseSensitive: false).hasMatch(value)) {
    return 'https://$value';
  }
  return value;
}

List<DetailRow> housePropertyDetailRows(House house) {
  const specs = [
    ('rent', '家賃'),
    ('managementFee', '管理費等'),
    ('genre', 'ジャンル'),
    ('depositKeyMoney', '敷/礼'),
    ('areaSize', '間取り'),
    ('floorArea', '面積'),
    ('floors', '階建'),
    ('buildingAge', '築年数'),
  ];
  final rows = <DetailRow>[];
  for (final spec in specs) {
    final value = house.fields[spec.$1].trim();
    if (value.isNotEmpty) rows.add(DetailRow(label: spec.$2, value: value));
  }
  final location = houseLocationLine(house);
  if (location.isNotEmpty) rows.add(DetailRow(label: '地域', value: location));
  final referenceUrl = house.referenceUrl.trim();
  if (referenceUrl.isNotEmpty) {
    rows.add(DetailRow(label: '参考リンク', value: referenceUrl, href: hrefForReferenceUrl(referenceUrl)));
  }
  return rows;
}

List<String> housePropertyListChips(House house) {
  final chips = <String>[];
  if (house.rent.trim().isNotEmpty) chips.add('家賃 ${house.rent.trim()}');
  if (isKnownLayoutAreaSize(house.areaSize)) {
    chips.add(house.areaSize);
  } else if (house.areaSize.trim().isNotEmpty) {
    chips.add(house.areaSize.trim());
  }
  if (house.floorArea.trim().isNotEmpty) chips.add(house.floorArea.trim());
  if (isKnownHouseGenre(house.genre)) {
    chips.add(house.genre);
  } else if (house.genre.trim().isNotEmpty) {
    chips.add(house.genre.trim());
  }
  return chips;
}

HouseListSummary houseListSummaryLines(House house) {
  final title = house.title.trim();
  return HouseListSummary(
    title: title.isEmpty ? '（無題）' : title,
    listedDate: formatDateOnly(house.createdAt),
  );
}

int clampCarouselIndex(int index, int count) {
  if (count <= 0) return 0;
  if (index < 0) return 0;
  if (index > count - 1) return count - 1;
  return index;
}

int indexForHouseId(List<House> houses, String? houseId) {
  if (houseId == null || houseId.isEmpty || houses.isEmpty) return 0;
  final index = houses.indexWhere((house) => house.id == houseId);
  return index >= 0 ? index : 0;
}

String homePathForHouse(String houseId) => '/?$houseListQueryKey=$houseId';
