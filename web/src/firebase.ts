import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

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
    // Safari など WebChannel ストリーミングが通らない環境で
    // 自動的に long polling にフォールバックさせる
    db = initializeFirestore(getFirebaseApp(), {
      experimentalAutoDetectLongPolling: true,
    });
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

const COVER_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

/** 物件の代表画像を Storage に保存し、ダウンロード URL を返す */
export async function uploadHouseCoverImage(houseId: string, file: File): Promise<string> {
  const raw = file.name.split('.').pop()?.toLowerCase();
  const ext = raw && COVER_EXT.has(raw) ? raw : 'jpg';
  const path = `houses/${houseId}/cover.${ext}`;
  const storageRef = ref(getStorageApp(), path);
  await uploadBytes(storageRef, file, {
    contentType: file.type && file.type.startsWith('image/') ? file.type : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  return getDownloadURL(storageRef);
}
