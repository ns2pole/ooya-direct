import 'dart:math';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../logic/photo_files.dart';
import 'house_repository.dart';

class PendingPhotoFile {
  const PendingPhotoFile({required this.name, required this.bytes, required this.mimeType});

  final String name;
  final Uint8List bytes;
  final String? mimeType;
}

class HouseTextFields {
  const HouseTextFields({
    required this.title,
    required this.description,
    required this.prefecture,
    required this.city,
    required this.town,
    required this.fields,
  });

  final String title;
  final String description;
  final String prefecture;
  final String city;
  final String town;
  final HousePropertyFields fields;
}

class HouseEditor {
  HouseEditor({
    FirebaseFirestore? firestore,
    FirebaseStorage? storage,
    HouseRepository? houses,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _storage = storage ?? FirebaseStorage.instance,
        _houses = houses ?? HouseRepository(firestore: firestore);

  final FirebaseFirestore _firestore;
  final FirebaseStorage _storage;
  final HouseRepository _houses;

  CollectionReference<Map<String, dynamic>> _photos(String houseId) {
    return _firestore.collection('houses').doc(houseId).collection('photos');
  }

  Future<String> createHouse({
    required String ownerId,
    required String landlordId,
    required HouseTextFields text,
  }) async {
    final ref = await _firestore.collection('houses').add({
      'ownerId': ownerId,
      'landlordId': landlordId,
      'sourceId': '',
      'fromSync': false,
      'hidden': false,
      'title': text.title.trim(),
      'description': text.description.trim(),
      'prefecture': text.prefecture.trim(),
      'city': text.city.trim(),
      'town': text.town.trim(),
      ...text.fields.toPayload(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  Future<List<HousePhoto>> saveHouseWithPhotos({
    required String houseId,
    required String ownerId,
    required HouseTextFields text,
    required List<HousePhoto> existing,
    required Set<String> removedIds,
    required List<PendingPhotoFile> pendingFiles,
    required bool photoChanged,
    void Function(SaveProgressStep step, String? detail)? onProgress,
  }) async {
    final saved = photoChanged
        ? await _applyPhotoChanges(
            houseId: houseId,
            existing: existing,
            removedIds: removedIds,
            pendingFiles: pendingFiles,
            onProgress: onProgress,
          )
        : existing.where((photo) => !removedIds.contains(photo.id)).toList();
    onProgress?.call(SaveProgressStep.house, null);
    try {
      await _firestore.collection('houses').doc(houseId).update(
            _houseUpdate(ownerId, text, saved),
          );
    } catch (error) {
      throw _step('物件情報の保存', error);
    }
    return saved;
  }

  Future<void> deleteAllHousePhotos(String houseId) async {
    final photos = await _houses.listHousePhotos(houseId);
    await Future.wait(photos.map((photo) async {
      await _photos(houseId).doc(photo.id).delete();
      try {
        await _storage.refFromURL(photo.url).delete();
      } catch (_) {}
    }));
  }

  Future<List<HousePhoto>> _applyPhotoChanges({
    required String houseId,
    required List<HousePhoto> existing,
    required Set<String> removedIds,
    required List<PendingPhotoFile> pendingFiles,
    void Function(SaveProgressStep step, String? detail)? onProgress,
  }) async {
    for (final photo in existing) {
      if (!removedIds.contains(photo.id)) continue;
      try {
        await _photos(houseId).doc(photo.id).delete();
        try {
          await _storage.refFromURL(photo.url).delete();
        } catch (_) {}
      } catch (error) {
        throw _step('写真の削除', error);
      }
    }

    final kept = existing.where((photo) => !removedIds.contains(photo.id)).toList();
    var nextOrder = 0;
    if (kept.isNotEmpty) {
      nextOrder = kept.map((photo) => photo.order).reduce((a, b) => a > b ? a : b) + 1;
    }

    for (var i = 0; i < pendingFiles.length; i++) {
      final file = pendingFiles[i];
      final label = '${i + 1}/${pendingFiles.length} 枚目';
      onProgress?.call(SaveProgressStep.upload, label);
      final String url;
      try {
        url = await _upload(houseId, file);
      } catch (error) {
        throw _step('画像のアップロード（Storage）', error);
      }
      try {
        onProgress?.call(SaveProgressStep.photos, label);
        await _photos(houseId).add({
          'url': url,
          'order': nextOrder,
          'createdAt': FieldValue.serverTimestamp(),
        });
      } catch (error) {
        throw _step('photos サブコレクションへの保存', error);
      }
      nextOrder += 1;
    }

    return _houses.listHousePhotos(houseId);
  }

  Future<String> _upload(String houseId, PendingPhotoFile file) async {
    final ext = photoExtension(file.name);
    final path = 'houses/$houseId/photos/${_randomId()}.$ext';
    final ref = _storage.ref(path);
    await ref.putData(
      file.bytes,
      SettableMetadata(contentType: photoContentType(file.name, file.mimeType)),
    );
    return ref.getDownloadURL();
  }

  Map<String, Object?> _houseUpdate(String ownerId, HouseTextFields text, List<HousePhoto> saved) {
    return {
      'ownerId': ownerId,
      'title': text.title.trim(),
      'description': text.description.trim(),
      'prefecture': text.prefecture.trim(),
      'city': text.city.trim(),
      'town': text.town.trim(),
      ...text.fields.toPayload(),
      'photoUrl': FieldValue.delete(),
      'photoUrls': FieldValue.delete(),
      'coverPhotoUrl': saved.isNotEmpty ? saved.first.url : FieldValue.delete(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  Exception _step(String step, Object error) {
    return Exception('【$step】${messageForHouseFormSaveError(error)}');
  }
}

String _randomId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int value) => value.toRadixString(16).padLeft(2, '0');
  final raw = bytes.map(hex).join();
  return '${raw.substring(0, 8)}-${raw.substring(8, 12)}-${raw.substring(12, 16)}-${raw.substring(16, 20)}-${raw.substring(20)}';
}
