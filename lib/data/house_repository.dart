import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../logic/house.dart';

const functionsRegion = 'asia-northeast1';

class HouseRecord {
  const HouseRecord(this.house, this.data);

  final House house;
  final Map<String, dynamic> data;
}

class Inquiry {
  const Inquiry({required this.id, required this.message, required this.createdAt});

  final String id;
  final String message;
  final DateTime? createdAt;
}

class HouseRepository {
  HouseRepository({FirebaseFirestore? firestore, FirebaseFunctions? functions})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _functions = functions ?? FirebaseFunctions.instanceFor(region: functionsRegion);

  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;

  Future<List<House>> listPublicHouses() async {
    final snap = await _firestore.collection('houses').orderBy('createdAt', descending: true).get();
    return snap.docs.map((doc) => mapHouse(doc.id, doc.data())).where((house) => !house.hidden).toList();
  }

  Future<HouseRecord?> getPublicHouse(String houseId) async {
    final snap = await _firestore.collection('houses').doc(houseId).get();
    if (!snap.exists) return null;
    final data = snap.data() ?? <String, dynamic>{};
    final house = mapHouse(snap.id, data);
    if (house.hidden) return null;
    return HouseRecord(house, data);
  }

  Future<List<HousePhoto>> listHousePhotos(String houseId) async {
    final col = _firestore.collection('houses').doc(houseId).collection('photos');
    try {
      final snap = await col.orderBy('order').get();
      return snap.docs.map((doc) => mapHousePhoto(doc.id, doc.data())).toList();
    } catch (_) {
      final snap = await col.get();
      final photos = snap.docs.map((doc) => mapHousePhoto(doc.id, doc.data())).toList();
      photos.sort((a, b) {
        final order = a.order.compareTo(b.order);
        if (order != 0) return order;
        return a.id.compareTo(b.id);
      });
      return photos;
    }
  }

  Future<List<String>> listPhotoUrls(String houseId) async {
    final photos = await listHousePhotos(houseId);
    return photos.map((photo) => photo.url).where((url) => url.isNotEmpty).toList();
  }

  Future<List<HousePhoto>> loadHousePhotosForDisplay(String houseId, Map<String, dynamic> data) async {
    final photos = await listHousePhotos(houseId);
    if (photos.isNotEmpty) return photos;
    final legacy = legacyPhotoUrlsFromHouse(data);
    if (legacy.isEmpty) return [];
    final col = _firestore.collection('houses').doc(houseId).collection('photos');
    for (var i = 0; i < legacy.length; i++) {
      await col.add({
        'url': legacy[i],
        'order': i,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
    return listHousePhotos(houseId);
  }

  Future<List<Inquiry>> listInquiries(String houseId) async {
    final snap = await _firestore
        .collection('houses')
        .doc(houseId)
        .collection('inquiries')
        .orderBy('createdAt', descending: true)
        .get();
    return snap.docs.map((doc) {
      final data = doc.data();
      return Inquiry(
        id: doc.id,
        message: '${data['message'] ?? ''}',
        createdAt: readDate(data['createdAt']),
      );
    }).toList();
  }

  Future<void> submitInquiry({required String houseId, required String message}) async {
    await _functions.httpsCallable('submitInquiry').call({
      'houseId': houseId,
      'message': message.trim(),
    });
  }
}
