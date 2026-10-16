import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class FirebaseEnv {
  static const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const authDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN');
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const storageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');
  static const messagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const appId = String.fromEnvironment('FIREBASE_APP_ID');

  static const _keys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ];

  static bool get isConfigured => missingKeys.isEmpty;

  static List<String> get missingKeys {
    final values = {
      'FIREBASE_API_KEY': apiKey,
      'FIREBASE_AUTH_DOMAIN': authDomain,
      'FIREBASE_PROJECT_ID': projectId,
      'FIREBASE_STORAGE_BUCKET': storageBucket,
      'FIREBASE_MESSAGING_SENDER_ID': messagingSenderId,
      'FIREBASE_APP_ID': appId,
    };
    return _keys.where((key) => values[key]!.trim().isEmpty).toList();
  }

  static FirebaseOptions get options => FirebaseOptions(
        apiKey: apiKey,
        authDomain: authDomain,
        projectId: projectId,
        storageBucket: storageBucket,
        messagingSenderId: messagingSenderId,
        appId: appId,
      );

  static Future<void> init() async {
    if (!isConfigured) return;
    await Firebase.initializeApp(options: options);
  }
}

String firebaseErrorText(Object error, {String fallback = '読み込みに失敗しました。'}) {
  if (error is FirebaseException) {
    final message = error.message;
    if (message != null && message.isNotEmpty) return message;
    if (error.code.isNotEmpty) return error.code;
  }
  return fallback;
}

String messageForHouseFormSaveError(Object error) {
  final code = error is FirebaseException ? error.code : '';
  if (code == 'unauthorized' || code == 'storage/unauthorized') {
    return '画像のアップロードが拒否されました（storage/unauthorized）。'
        'Firebase Storage のルール・バケット名（FIREBASE_STORAGE_BUCKET）・'
        '物件の ownerId（ログイン UID と一致）を README の「トラブルシューティング（Storage / Safari）」で確認してください。';
  }
  if (code == 'permission-denied') {
    return '保存が拒否されました（permission-denied）。'
        'Firestore ルールのデプロイ（firebase deploy --only firestore:rules）を確認してください。'
        'photos サブコレクションのルールが未反映の可能性があります。';
  }
  if (error is FirebaseException) {
    final message = error.message;
    if (message != null && message.isNotEmpty) return message;
  }
  if (error is Exception) {
    final text = error.toString();
    const prefix = 'Exception: ';
    if (text.startsWith(prefix)) return text.substring(prefix.length);
  }
  return '保存に失敗しました。';
}

bool get isLocalBuild => kDebugMode;
