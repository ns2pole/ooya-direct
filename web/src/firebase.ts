import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';

export const FUNCTIONS_REGION = 'asia-northeast1';

const ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function buildOptions(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

/** 未入力の環境変数名（バナー表示・デバッグ用） */
export function missingFirebaseEnvKeys(): string[] {
  const env = import.meta.env;
  return ENV_KEYS.filter((key) => {
    const v = env[key as keyof ImportMetaEnv];
    return typeof v !== 'string' || v.trim() === '';
  });
}

const options = buildOptions();
export const isFirebaseConfigured = options !== null;

/** WebKit 系で Firestore の WebChannel がブロックされやすい環境では long polling を強制する */
function preferFirestoreForceLongPolling(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const desktopSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
  const iOS = /iPhone|iPad|iPod/.test(ua);
  return desktopSafari || iOS;
}

function firebaseErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const c = (err as { code: unknown }).code;
    return typeof c === 'string' ? c : undefined;
  }
  return undefined;
}

/** 物件フォーム保存時のエラーメッセージ（Storage 拒否時は README 指向のヒント） */
export function messageForHouseFormSaveError(err: unknown): string {
  const code = firebaseErrorCode(err);
  if (code === 'storage/unauthorized') {
    return (
      '画像のアップロードが拒否されました（storage/unauthorized）。' +
      'Firebase Storage のルール・バケット名（VITE_FIREBASE_STORAGE_BUCKET）・' +
      '物件の ownerId（ログイン UID と一致）を README の「トラブルシューティング（Storage / Safari）」で確認してください。'
    );
  }
  if (code === 'permission-denied') {
    return (
      '保存が拒否されました（permission-denied）。' +
      'Firestore ルールのデプロイ（firebase deploy --only firestore:rules）を確認してください。' +
      'photos サブコレクションのルールが未反映の可能性があります。'
    );
  }
  return err instanceof Error ? err.message : '保存に失敗しました。';
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!options) {
    throw new Error(
      'Firebase が未設定です。web/.env.example を .env.local にコピーして値を埋めてください。'
    );
  }
  if (!app) {
    app = initializeApp(options);
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    const forceLongPolling = preferFirestoreForceLongPolling();
    // WebKit: Listen/channel の access control 失敗を避けるため long polling を強制。
    // それ以外: WebChannel が通らないときだけ long polling に切り替え。
    db = initializeFirestore(
      getFirebaseApp(),
      forceLongPolling
        ? { experimentalForceLongPolling: true }
        : { experimentalAutoDetectLongPolling: true },
    );
  }
  return db;
}

export function getAuthApp(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFns() {
  return getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
}

export function getStorageApp(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']);

function photoExtension(file: File): string {
  const raw = file.name.split('.').pop()?.toLowerCase();
  return raw && PHOTO_EXT.has(raw) ? raw : 'jpg';
}

function photoContentType(file: File, ext: string): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
}

/** 物件の写真を Storage に保存し、ダウンロード URL を返す */
export async function uploadHousePhoto(houseId: string, file: File): Promise<string> {
  const ext = photoExtension(file);
  const id = crypto.randomUUID();
  const path = `houses/${houseId}/photos/${id}.${ext}`;
  const storageRef = ref(getStorageApp(), path);
  await uploadBytes(storageRef, file, {
    contentType: photoContentType(file, ext),
  });
  return getDownloadURL(storageRef);
}

/** Storage 上の物件写真を URL から削除する（失敗時は呼び出し側で無視可） */
export async function deleteHousePhotoByUrl(downloadUrl: string): Promise<void> {
  const storageRef = ref(getStorageApp(), downloadUrl);
  await deleteObject(storageRef);
}
