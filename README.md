# 物件ダイレクト（GitHub Pages + Firebase）

大家が物件を登録・編集し、未ログインの利用者が物件を閲覧して公開の問い合わせを投稿できる最小構成のサンプルです。

## 構成

- `web/` … Vite + React + TypeScript（静的フロント）
- `functions/` … Cloud Functions（`submitInquiry`：問い合わせのサーバー側受付）
- `firestore.rules` … Firestore セキュリティルール

## 事前準備（Firebase コンソール）

1. プロジェクトを作成する。
2. **Firestore** を有効化する（本番モードで開始し、ルールはリポジトリの `firestore.rules` をデプロイする）。
3. **Authentication** → Sign-in method で **Google** を有効化する。
4. プロジェクト設定から **ウェブアプリ** を登録し、表示される設定値をコピーする。

## ローカル開発（フロント）

```bash
cd web
cp .env.example .env.local
# .env.local に Firebase の各キーを貼る

npm install
npm run dev
```

## Cloud Functions

リージョンは **asia-northeast1** です。フロントの `FUNCTIONS_REGION` と一致させています。

```bash
cd functions
npm install
npm run build
```

ルートで Firebase CLI を使う場合:

```bash
# .firebaserc の your-firebase-project-id を実 ID に置き換える
firebase deploy --only functions,firestore:rules,firestore:indexes
```

初回、マイ物件一覧用の複合インデックスが必要な場合はデプロイログに表示されるリンクから作成できます（`firestore.indexes.json` も参照）。

## GitHub Pages

1. `web/.env.local` の `VITE_BASE` を、公開 URL に合わせる（例: `/リポジトリ名/`）。
2. `cd web && npm run build` で `web/dist` を生成する。
3. `dist` の中身を GitHub Pages の公開ブランチ（例: `docs/` や `gh-pages`）に配置する。

ルーティングは **HashRouter**（`#/...`）なので、SPA の 404 設定なしでも動きやすいです。

## データモデル

- `houses/{houseId}` … `ownerId`, `title`, `description`, `createdAt`, `updatedAt`
- `houses/{houseId}/inquiries/{inquiryId}` … `message`, `displayName`, `createdAt`（書き込みは Functions のみ）

## ライセンス

用途に合わせて自由に改変してください。
