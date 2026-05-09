/**
 * テスト用に houses に1件だけ追加する（Admin SDK のためルールは関係なし）
 *
 * 事前準備:
 * 1. Firebase コンソール → プロジェクトの設定 → サービス アカウント
 * 2. 「新しい秘密鍵の生成」で JSON をダウンロード（リポジトリにコミットしない）
 * 3. 大家の UID（任意）: Authentication で自分のユーザーを開き「ユーザー UID」をコピー
 *
 * 実行例:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/Downloads/ooya-direct-xxxxx.json"
 *   node scripts/seed-test-house.cjs
 *
 * 環境変数:
 *   GOOGLE_APPLICATION_CREDENTIALS … サービスアカウント JSON のパス（必須）
 *   OWNER_ID … ownerId に使う UID（省略時はプレースホルダ。大家画面には出ない）
 *   TITLE, DESCRIPTION … 省略可
 */

const path = require('path');
const admin = require('firebase-admin');

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS を設定してください（サービスアカウント JSON のパス）。');
  process.exit(1);
}

const ownerId =
  process.env.OWNER_ID || 'test-owner-placeholder';
const title = process.env.TITLE || 'コマンドで投入したテスト物件';
const description =
  process.env.DESCRIPTION ||
  'scripts/seed-test-house.cjs から登録しました。不要ならコンソールまたはアプリから削除してください。';

const resolved = path.resolve(keyPath);
const serviceAccount = require(resolved);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const ref = await db.collection('houses').add({
    ownerId,
    title,
    description,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('作成しました:', ref.id);
  console.log('公開URL例: https://ns2pole.github.io/ooya-direct/#/houses/' + ref.id);
  if (ownerId === 'test-owner-placeholder') {
    console.log(
      '\n※ OWNER_ID がプレースホルダです。大家の「マイ物件」には出ません。実UIDを OWNER_ID= に指定してください。'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
