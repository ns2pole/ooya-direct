import 'package:flutter_test/flutter_test.dart';
import 'package:ooya_direct/address/geolonia.dart';
import 'package:ooya_direct/logic/photo_files.dart';

void main() {
  test('市区町村名は郡と区を含める', () {
    expect(cityName({'county': '南牟婁郡', 'city': '紀宝町'}), '南牟婁郡紀宝町');
    expect(cityName({'city': '新宿区'}), '新宿区');
    expect(machiAzaName({'oaza_cho': 'つつじが丘', 'chome': '一丁目', 'koaza': ''}), 'つつじが丘一丁目');
  });

  test('都道府県JSONから市区町村の候補を作る', () {
    final prefs = parsePrefectures({
      'data': [
        {
          'pref': '東京都',
          'cities': [
            {'city': '新宿区'},
            {'city': '千代田区'},
            {'city': '新宿区'},
          ],
        },
      ],
    });
    expect(prefectureNames(prefs), ['東京都']);
    expect(cityNamesFor(prefs, '東京都'), ['千代田区', '新宿区']);
  });

  test('町字JSONから空でない名前だけを返す', () {
    expect(
      parseTownNames({
        'data': [
          {'oaza_cho': 'つつじが丘', 'chome': '一丁目'},
          {'oaza_cho': ''},
        ],
      }),
      ['つつじが丘一丁目'],
    );
  });

  test('写真の種類と枚数を保存前に弾く', () {
    expect(validatePhotoFile(name: 'memo.txt', size: 10), '画像ファイル（JPEG / PNG / GIF / WebP / HEIC）を選んでください。');
    expect(validatePhotoFile(name: 'room.jpg', size: maxImageBytes + 1), '画像は 5MB 以下にしてください。');
    expect(validatePhotoFile(name: 'room.HEIC', size: 100), isNull);
    expect(
      photoSelectionError(
        existingCount: 19,
        pendingCount: 1,
        files: const [(name: 'a.jpg', size: 10, mimeType: null)],
      ),
      '写真は最大 20 枚までです。',
    );
    expect(photoExtension('photo.PNG'), 'png');
    expect(photoContentType('photo.jpg', null), 'image/jpeg');
    expect(progressStepLabel(SaveProgressStep.upload, '1/2 枚目'), '画像をアップロード中…（1/2 枚目）');
    expect(progressStepLabel(SaveProgressStep.house), '物件情報を保存中…');
  });
}
