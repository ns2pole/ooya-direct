import 'package:flutter_test/flutter_test.dart';
import 'package:ooya_direct/logic/house.dart';

const _keepDate = Object();

House sampleHouse({
  String title = 'テスト物件1',
  String managementFee = '5000円',
  String genre = 'マンション',
  String referenceUrl = '',
  Object? createdAt = _keepDate,
}) {
  return House(
    id: 'h1',
    ownerId: 'u1',
    title: title,
    description: '',
    coverPhotoUrl: null,
    prefecture: '三重県',
    city: '名張市',
    town: '桔梗が丘一番町',
    fields: HousePropertyFields(
      rent: '6万円',
      managementFee: managementFee,
      genre: genre,
      depositKeyMoney: '1ヶ月/1ヶ月',
      areaSize: '5LDK',
      floorArea: '45㎡',
      floors: '3階建 / 2階',
      buildingAge: '築15年',
      referenceUrl: referenceUrl,
    ),
    landlordId: '',
    sourceId: '',
    fromSync: false,
    hidden: false,
    createdAt: identical(createdAt, _keepDate) ? DateTime(2026, 5, 11) : createdAt as DateTime?,
    updatedAt: null,
  );
}

void main() {
  test('物件詳細の行は項目順で、空は省く', () {
    expect(housePropertyDetailRows(sampleHouse()), [
      const DetailRow(label: '家賃', value: '6万円'),
      const DetailRow(label: '管理費等', value: '5000円'),
      const DetailRow(label: 'ジャンル', value: 'マンション'),
      const DetailRow(label: '敷/礼', value: '1ヶ月/1ヶ月'),
      const DetailRow(label: '間取り', value: '5LDK'),
      const DetailRow(label: '面積', value: '45㎡'),
      const DetailRow(label: '階建', value: '3階建 / 2階'),
      const DetailRow(label: '築年数', value: '築15年'),
      const DetailRow(label: '地域', value: '三重県 名張市 桔梗が丘一番町'),
    ]);
    expect(
      housePropertyDetailRows(sampleHouse(managementFee: '', genre: '')).map((row) => row.label),
      ['家賃', '敷/礼', '間取り', '面積', '階建', '築年数', '地域'],
    );
  });

  test('参考リンクは地域の後', () {
    expect(
      housePropertyDetailRows(sampleHouse(referenceUrl: 'https://www.yahoo.co.jp')).last,
      const DetailRow(label: '参考リンク', value: 'https://www.yahoo.co.jp', href: 'https://www.yahoo.co.jp'),
    );
    expect(hrefForReferenceUrl(''), isNull);
    expect(hrefForReferenceUrl('www.yahoo.co.jp'), 'https://www.yahoo.co.jp');
  });

  test('一覧のタイトルと掲載日', () {
    expect(
      houseListSummaryLines(sampleHouse()),
      const HouseListSummary(title: 'テスト物件1', listedDate: '2026/5/11'),
    );
    expect(houseListSummaryLines(sampleHouse(title: '  ')).title, '（無題）');
    expect(houseListSummaryLines(sampleHouse(createdAt: null)).listedDate, '—');
  });

  test('カルーセルの位置', () {
    final houses = [
      sampleHouse(),
      sampleHouse(),
    ];
    final second = House(
      id: 'b',
      ownerId: 'u1',
      title: 'b',
      description: '',
      coverPhotoUrl: null,
      prefecture: '',
      city: '',
      town: '',
      fields: HousePropertyFields.empty,
      landlordId: '',
      sourceId: '',
      fromSync: false,
      hidden: false,
      createdAt: null,
      updatedAt: null,
    );
    final list = [houses.first, second];
    expect(indexForHouseId(list, 'b'), 1);
    expect(indexForHouseId(list, null), 0);
    expect(indexForHouseId(list, 'missing'), 0);
    expect(clampCarouselIndex(-1, 3), 0);
    expect(clampCarouselIndex(9, 3), 2);
    expect(homePathForHouse('abc'), '/?house=abc');
  });

  test('旧写真URLを拾う', () {
    expect(
      legacyPhotoUrlsFromHouse({
        'photoUrls': [' https://a ', 'https://a', 'https://b'],
      }),
      ['https://a', 'https://b'],
    );
    expect(legacyPhotoUrlsFromHouse({'photoUrl': 'https://c'}), ['https://c']);
  });

  test('ログインエラー文', () {
    expect(messageForAuthCode('auth/invalid-credential'), 'メールアドレスまたはパスワードが正しくありません。');
    expect(messageForAuthCode('auth/unknown'), 'ログインに失敗しました。');
  });
}
