# 物件ダイレクト（GitHub Pages + Firebase バックエンド）

大家が物件を登録・編集し、未ログインの利用者が物件を閲覧して公開の問い合わせを投稿できる最小構成です。

**フロントのホスティングは GitHub Pages のみ**（Firebase Hosting は使いません）。Firestore・Authentication・Cloud Functions は Firebase 側でそのまま利用します。

## 構成

- `web/` … Vite + React（**GitHub Pages で配信**）
- `functions/` … Cloud Functions（`submitInquiry`）
- `firestore.rules` / `firestore.indexes.json` … Firestore

## 事前準備（Firebase コンソール）

1. **Firestore** を有効化し、本リポジトリの `firestore.rules` をデプロイ（またはコンソールに貼り付けて公開）。
2. **Authentication** → **Sign-in method** で **メール/パスワード（Email/Password）** を有効化する。
3. **Authentication** → **Users** で大家用ユーザーを追加する（メールアドレスとパスワード。パスワードはリポジトリやチャットに書かず、コンソール上のみで設定する）。
4. **承認済みドメイン**に **`あなたのユーザー名.github.io`** を追加（例: `ns2pole.github.io`）。GitHub Pages のオリジンから Firebase Auth を使うために必要です。
5. ウェブアプリの設定値をローカルの `web/.env.local` 用に控える。

### 以前 Google でログインしていた場合（物件が一覧に出ないとき）

Firestore の `houses` ドキュメントの `ownerId` は、ログイン中ユーザーの **Firebase Auth の UID** と一致している必要があります。Google アカウント用の UID のまま登録した物件は、メール/パスワードで新規作成した別ユーザーでは一覧に表示されません。Firestore コンソールで該当ドキュメントの `ownerId` を、新しい大家ユーザーの UID（Authentication のユーザ一覧で確認）に更新するか、テスト用に `scripts/seed-test-house.cjs` で `OWNER_ID` を指定して登録し直してください。

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
2. **Build and deployment** → **Source は必ず GitHub Actions**（**Deploy from a branch は選ばない**）  
   - 「ブランチからデプロイ」で `main` / `(root)` にしていると、**README.md がサイトの本文のように表示**されます。React アプリは `web/` をビルドした成果物なので、**Actions 経由だけ**にしてください。
3. 保存後、**Actions** タブで **GitHub Pages** ワークフローが成功しているか確認。失敗ならログを開く。初回は **Environments** で `github-pages` の承認が求められることがあります。
4. **Settings** → **Secrets and variables** → **Actions** で次の **Repository secrets** を追加（`web/.env.local` と同じ値）:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

5. `main` に push すると [`.github/workflows/github-pages.yml`](.github/workflows/github-pages.yml) が走り、`https://<ユーザー>.github.io/<リポジトリ名>/` に公開されます。  
   **ベースパス**はワークフロー内で `VITE_BASE=/<リポジトリ名>/` に自動設定しています。

カスタムドメインにする場合は、Vite の `base` と DNS を合わせて調整し、Firebase の承認済みドメインにもそのドメインを追加してください。

## Cloud Functions（問い合わせ）

リージョンは **asia-northeast1** です。

```bash
cd functions && npm install && npm run build
cd .. && firebase deploy --only functions
```

## テスト用に物件をコマンドで1件追加する

Firestore のルールは **Firebase Admin SDK** ではバイパスされるため、サービスアカウント鍵があれば CLI から登録できます。

1. Firebase コンソール → **プロジェクトの設定** → **サービス アカウント** → **新しい秘密鍵の生成**（JSON を保存。**Git にコミットしない**）
2. `functions` で依存関係を入れておく（`firebase-admin` を使うため）:

   ```bash
   cd functions && npm install
   ```

3. 実行:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/絶対パス/サービスアカウント.json"
   # 大家のマイ物件に出したいときは Authentication のユーザー UID を指定
   export OWNER_ID="あなたのFirebase AuthのUID"
   export TITLE="CLIテスト物件"   # 任意
   cd functions
   node ../scripts/seed-test-house.cjs
   ```

`OWNER_ID` を省略すると一覧には載りますが、大家画面の「自分の物件」には出ません（プレースホルダ UID のため）。

## 手動で Pages に載せる場合

```bash
cd web
# 例: リポジトリ名が ooya-direct のとき
VITE_BASE=/ooya-direct/ npm run build
# 生成された dist/ を任意の方法で GitHub Pages 用ブランチや docs/ に配置
```

ルーティングは **HashRouter**（`#/...`）です。ヘッダーにはナビリンクを出さない構成です。直接 URL で開く場合は次のパス（`#` 以降）を使います。

| 画面 | パス（`#` 以降） | 例（リポジトリ名が `ooya-direct` のとき） |
|------|-------------------|------------------------------------------|
| 物件一覧（トップ） | `/` | `https://<ユーザー>.github.io/ooya-direct/#/` |
| 物件詳細 | `/houses/{houseId}` | `https://<ユーザー>.github.io/ooya-direct/#/houses/abc123` |
| 大家ログイン・マイ物件 | `/landlord` | `https://<ユーザー>.github.io/ooya-direct/#/landlord` |
| 物件の新規登録 | `/landlord/houses/new` | `https://<ユーザー>.github.io/ooya-direct/#/landlord/houses/new` |
| 物件の編集 | `/landlord/houses/{houseId}/edit` | `https://<ユーザー>.github.io/ooya-direct/#/landlord/houses/abc123/edit` |

ローカル開発（`npm run dev`）でも同じく `http://localhost:5173/#/landlord` のように `#` 以降で指定します。

## データモデル

- `houses/{houseId}` … `ownerId`, `title`, `description`, `coverPhotoUrl`（一覧サムネ用）, 住所・家賃など, `createdAt`, `updatedAt`
- `houses/{houseId}/photos/{photoId}` … `url`, `order`, `label`, `createdAt`（物件 1 : 画像 N）
- `houses/{houseId}/inquiries/{inquiryId}` … `message`, `displayName`, `createdAt`（書き込みは Functions のみ）

画像ファイル本体は Firebase Storage の `houses/{houseId}/photos/{uuid}.{ext}` に保存します。

旧データの `photoUrl` / `photoUrls`（配列）は、編集・詳細表示時に自動で `photos` サブコレクションへ移行されます。

## 物件写真の保存手順（大家・編集画面）

写真は **ファイル選択だけでは保存されません**。必ず **「保存」ボタン** を押してください。

1. 大家ログイン → **マイ物件** → 物件の **編集**（または新規登録）
2. **写真** の「ファイルを選択」で 1 枚以上選ぶ → プレビューに **「新規」** バッジが付く
3. フォーム下部の **「保存」** をクリック
4. 保存ボタンの上に **ステータス欄** が表示される:
   - 青: 「画像をアップロード中…」→「photos へ保存中…」→「物件情報を保存中…」
   - 緑: **「保存完了（写真 N 枚）」**
   - 赤: 失敗したステップとエラー全文（例: Storage 拒否、photos への書き込み拒否）
5. **Firebase コンソール** で確認:
   - **Firestore** → `houses` → 対象 `{houseId}` → **サブコレクション `photos`**
   - 1 枚ごとにドキュメントが増え、`url` / `order` / `createdAt` が入っている
   - 親ドキュメントの `coverPhotoUrl` は先頭写真の URL（一覧サムネ用）
6. **公開ページ**（物件詳細）で 2 枚以上なら ‹ › と `2 / N` 表示

**うまくいかないとき**

- タイトル未入力だと HTML バリデーションで保存が始まらない → ステータス欄に「タイトルは必須」と出る
- ファイル選択後すぐ保存しても、プレビュー（新規バッジ）が出ていれば保存対象に含まれる
- `photos` が空のまま → [`firestore.rules`](firestore.rules) を `firebase deploy --only firestore:rules` で再デプロイ
- Storage エラー → 下記「Storage: storage/unauthorized」を参照

## トラブルシューティング（Storage の `storage/unauthorized` と Safari の Firestore）

### Storage: `User does not have permission` / `storage/unauthorized`

ルールは [`storage.rules`](storage.rules) のとおり、**ログイン済み・画像 5MB 未満・`image/*`・Firestore に `houses/{houseId}` があり `ownerId` がログイン UID と一致**したときだけ書き込みを許可します。デプロイ済みでも次を順に確認してください。

1. **バケット名（`VITE_FIREBASE_STORAGE_BUCKET`）**  
   ブラウザの開発者ツール → **Network** で、失敗した Storage リクエストの URL のホスト（例: `*.appspot.com` や `*.firebasestorage.app`）を確認し、Firebase コンソール → **Storage** に表示されている**既定バケット名**と一致するか見る。GitHub Actions の **Repository secrets** と `web/.env.local` の誤りがよくあります。  
   `firebase deploy --only storage` でルールはそのプロジェクトのバケットに紐づきます。**別バケット**にクライアントだけ向いていると、ルールどおりでも常に拒否されます。

2. **`ownerId` と UID**  
   Firestore で該当 `houses/{houseId}` を開き、**Authentication** の現在ユーザー **UID** と `ownerId` が完全一致するか確認する（シードのプレースホルダ、別プロバイダで作ったユーザーなどは、本 README の「以前 Google でログインしていた場合」の節を参照）。

3. **画像**  
   5MB 超、`image/*` 以外として評価されると拒否されます。

### Safari: `Firestore/Listen/channel` と `access control checks`

コンソールに出る **Fetch API cannot load … Firestore/Listen/channel … due to access control checks** は、端末上の Firestore **リアルタイム接続（WebChannel）**が WebKit 側でブロックされやすいときのログです。**Storage セキュリティルール内の `firestore.get()` はサーバー側で実行される**ため、この Listen エラーと `storage/unauthorized` に**直接の因果はありません**（Safari 上で別々に起きやすいだけです）。

切り分けでは **Chrome（デスクトップ）で同じ操作**を試し、Storage が通るか・Listen エラーが消えるかを比較してください。アプリ側では WebKit 系ブラウザで Firestore の **long polling を優先**する設定を入れています（[`web/src/firebase.ts`](web/src/firebase.ts)）。

## ライセンス

用途に合わせて自由に改変してください。
