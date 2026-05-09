# 物件ダイレクト（GitHub Pages + Firebase バックエンド）

大家が物件を登録・編集し、未ログインの利用者が物件を閲覧して公開の問い合わせを投稿できる最小構成です。

**フロントのホスティングは GitHub Pages のみ**（Firebase Hosting は使いません）。Firestore・Authentication・Cloud Functions は Firebase 側でそのまま利用します。

## 構成

- `web/` … Vite + React（**GitHub Pages で配信**）
- `functions/` … Cloud Functions（`submitInquiry`）
- `firestore.rules` / `firestore.indexes.json` … Firestore

## 事前準備（Firebase コンソール）

1. **Firestore** を有効化し、本リポジトリの `firestore.rules` をデプロイ（またはコンソールに貼り付けて公開）。
2. **Authentication** → Google を有効化。
3. **承認済みドメイン**に **`あなたのユーザー名.github.io`** を追加（例: `ns2pole.github.io`）。GitHub Pages で Google ログインするために必要です。
4. ウェブアプリの設定値をローカルの `web/.env.local` 用に控える。

## ローカル開発

```bash
cd web
cp .env.example .env.local
# .env.local を埋める

npm install
npm run dev
```

ローカルでは `VITE_BASE=/` のままでよいです。

## GitHub Pages（自動デプロイ）

1. GitHub リポジトリ → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. **Settings** → **Secrets and variables** → **Actions** で次の **Repository secrets** を追加（`web/.env.local` と同じ値）:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

4. `main` に push すると [`.github/workflows/github-pages.yml`](.github/workflows/github-pages.yml) が走り、`https://<ユーザー>.github.io/<リポジトリ名>/` に公開されます。  
   **ベースパス**はワークフロー内で `VITE_BASE=/<リポジトリ名>/` に自動設定しています。

カスタムドメインにする場合は、Vite の `base` と DNS を合わせて調整し、Firebase の承認済みドメインにもそのドメインを追加してください。

## Cloud Functions（問い合わせ）

リージョンは **asia-northeast1** です。

```bash
cd functions && npm install && npm run build
cd .. && firebase deploy --only functions
```

## 手動で Pages に載せる場合

```bash
cd web
# 例: リポジトリ名が ooya-direct のとき
VITE_BASE=/ooya-direct/ npm run build
# 生成された dist/ を任意の方法で GitHub Pages 用ブランチや docs/ に配置
```

ルーティングは **HashRouter**（`#/...`）です。

## データモデル

- `houses/{houseId}` … `ownerId`, `title`, `description`, `createdAt`, `updatedAt`
- `houses/{houseId}/inquiries/{inquiryId}` … `message`, `displayName`, `createdAt`（書き込みは Functions のみ）

## ライセンス

用途に合わせて自由に改変してください。
