import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../data/house_repository.dart';
import '../logic/house.dart';

class BoardLandlord {
  const BoardLandlord({required this.id, required this.name});

  final String id;
  final String name;
}

class BoardSource {
  const BoardSource({
    required this.id,
    required this.landlordId,
    required this.portal,
    required this.url,
  });

  final String id;
  final String landlordId;
  final String portal;
  final String url;
}

class JimotyStatus {
  const JimotyStatus({
    required this.lastSyncedAt,
    required this.created,
    required this.updated,
    required this.removed,
    required this.unchanged,
  });

  final DateTime? lastSyncedAt;
  final int created;
  final int updated;
  final int removed;
  final int unchanged;
}

class SyncSummary {
  const SyncSummary({
    required this.created,
    required this.updated,
    required this.removed,
    required this.unchanged,
  });

  final int created;
  final int updated;
  final int removed;
  final int unchanged;

  String get label => '新規 $created件、更新 $updated件、変化なし $unchanged件、成約のため削除 $removed件';
}

class AdminCatalog {
  const AdminCatalog({
    required this.houses,
    required this.landlords,
    required this.sources,
    required this.status,
  });

  final List<House> houses;
  final List<BoardLandlord> landlords;
  final List<BoardSource> sources;
  final JimotyStatus? status;
}

class AdminRepository {
  AdminRepository({FirebaseFirestore? firestore, FirebaseFunctions? functions})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _functions = functions ?? FirebaseFunctions.instanceFor(region: functionsRegion);

  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;

  Future<AdminCatalog> load(String ownerId) async {
    final results = await Future.wait([
      _firestore.collection('houses').where('ownerId', isEqualTo: ownerId).orderBy('createdAt', descending: true).get(),
      _firestore.collection('landlords').where('ownerId', isEqualTo: ownerId).get(),
      _firestore.collection('portalSources').where('ownerId', isEqualTo: ownerId).get(),
      _firestore.collection('settings').doc('jimoty').get(),
    ]);
    final houseSnap = results[0] as QuerySnapshot<Map<String, dynamic>>;
    final landlordSnap = results[1] as QuerySnapshot<Map<String, dynamic>>;
    final sourceSnap = results[2] as QuerySnapshot<Map<String, dynamic>>;
    final settingsSnap = results[3] as DocumentSnapshot<Map<String, dynamic>>;

    final houses = houseSnap.docs.map((doc) => mapHouse(doc.id, doc.data())).toList();
    final landlords = landlordSnap.docs
        .map((doc) => BoardLandlord(id: doc.id, name: '${doc.data()['name'] ?? ''}'))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    final sources = sourceSnap.docs.map((doc) {
      final data = doc.data();
      return BoardSource(
        id: doc.id,
        landlordId: '${data['landlordId'] ?? ''}',
        portal: '${data['portal'] ?? ''}',
        url: '${data['url'] ?? ''}',
      );
    }).toList();
    final settings = settingsSnap.data();
    JimotyStatus? status;
    if (settings != null && settings['lastSyncedAt'] != null) {
      status = JimotyStatus(
        lastSyncedAt: readDate(settings['lastSyncedAt']),
        created: _num(settings['lastCreated']),
        updated: _num(settings['lastUpdated']),
        removed: _num(settings['lastRemoved']),
        unchanged: _num(settings['lastUnchanged']),
      );
    }
    return AdminCatalog(houses: houses, landlords: landlords, sources: sources, status: status);
  }

  Future<void> setHouseHidden(String houseId, bool hidden) async {
    await _firestore.collection('houses').doc(houseId).update({
      'hidden': hidden,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteManualHouse(String houseId) async {
    final photos = await _firestore.collection('houses').doc(houseId).collection('photos').get();
    await Future.wait(photos.docs.map((doc) => doc.reference.delete()));
    await _firestore.collection('houses').doc(houseId).delete();
  }

  Future<SyncSummary> syncNow() async {
    final result = await _functions.httpsCallable('syncJimotyNow').call();
    final data = Map<String, dynamic>.from(result.data as Map);
    return SyncSummary(
      created: _num(data['created']),
      updated: _num(data['updated']),
      removed: _num(data['removed']),
      unchanged: _num(data['unchanged']),
    );
  }

  Stream<({String? lineUserId, DateTime? linkedAt})> lineProfile(String uid) {
    return _firestore.collection('landlordProfiles').doc(uid).snapshots().map((snap) {
      final data = snap.data();
      if (data == null) return (lineUserId: null, linkedAt: null);
      final raw = data['lineUserId'];
      final lineUserId = raw is String && raw.isNotEmpty ? raw : null;
      return (lineUserId: lineUserId, linkedAt: readDate(data['linkedAt']));
    });
  }

  Future<String> startLineLink() async {
    final result = await _functions.httpsCallable('startLineLink').call();
    final data = Map<String, dynamic>.from(result.data as Map);
    return '${data['code'] ?? ''}';
  }

  Future<void> unlinkLine() async {
    await _functions.httpsCallable('unlinkLine').call();
  }
}

int _num(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

String? currentUid() => FirebaseAuth.instance.currentUser?.uid;
