# 🍀 先生アプリ

> **先生たちがAIで自作したWebアプリを共有するプラットフォーム**

---

## 📌 サイトコンセプト

Gemini・ChatGPT・Claude などの生成AIで先生が自作したWebアプリを共有し合うプラットフォームです。

**独自の強み：**
- 🤖 AIの「プロンプト（呪文）」も公開 → 先生同士のAIスキル向上
- 📦 学校のネット制限下でも使える「完全オフライン（HTMLダウンロード）型」ツールに特化
- 🔒 個人情報が外部に出ない安心設計

---

## ✅ 実装済み機能

| ページ | ファイル | 機能 |
|--------|---------|------|
| トップページ | `index.html` | ヒーロー・ピックアップ・アプリ一覧・カテゴリフィルター・ページネーション・検索 |
| アプリ一覧 | `apps.html` | タグ絞り込み・並び替え（新着/人気）・ページネーション |
| アプリ詳細 | `app-detail.html` | アプリ情報表示・いいね・共有・ダウンロード・プロンプトコピー |
| 投稿フォーム | `submit.html` | アプリ投稿（URL/HTMLファイル）・バリデーション・編集モード |
| マイページ | `mypage.html` | 投稿一覧・統計・非公開化・削除・編集リンク |
| 管理者ダッシュボード | `admin.html` | アプリ管理・ユーザーBAN・ピックアップ設定・お知らせ管理 |
| 利用規約 | `terms.html` | 利用規約全文（免責・禁止事項含む） |
| プライバシーポリシー | `privacy.html` | 収集情報・利用目的・第三者サービス |
| このサイトについて | `about.html` | コンセプト・技術スタック・使い方フロー |

---

## 🗂️ ファイル構成

```
/
├── index.html          # トップページ
├── apps.html           # アプリ一覧ページ
├── app-detail.html     # アプリ詳細ページ
├── submit.html         # アプリ投稿・編集フォーム
├── mypage.html         # マイページ（投稿管理ダッシュボード）
├── admin.html          # 管理者ダッシュボード
├── about.html          # このサイトについて
├── terms.html          # 利用規約
├── privacy.html        # プライバシーポリシー
├── css/
│   ├── style.css       # グローバルスタイル（変数・コンポーネント・レスポンシブ）
│   └── index.css       # トップページ・アプリカード専用スタイル
└── js/
    ├── firebase.js     # Firebase設定・全データ操作ヘルパー
    ├── auth.js         # 認証状態管理（共通）
    └── ui.js           # UI共通ユーティリティ（トースト・モーダル等）
```

---

## 📍 主要URL（パス）

| パス | 説明 |
|------|------|
| `/` | トップページ |
| `/apps.html` | アプリ一覧 |
| `/apps.html?tag=校務支援` | カテゴリ絞り込み |
| `/apps.html?search=キーワード` | 検索 |
| `/app-detail.html?id=<appId>` | アプリ詳細 |
| `/submit.html` | 新規投稿（要ログイン） |
| `/submit.html?edit=<appId>` | 編集モード（要ログイン・投稿者のみ） |
| `/mypage.html` | マイページ（要ログイン） |
| `/admin.html` | 管理者ダッシュボード（admin権限のみ） |
| `/terms.html` | 利用規約 |
| `/privacy.html` | プライバシーポリシー |
| `/about.html` | このサイトについて |

---

## 🔧 セットアップ手順（Firebase連携）

### 1. Firebaseプロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication → Google ログインを有効化
3. Firestore Database を作成（本番モード）
4. Cloud Storage を作成
5. Hosting を設定

### 2. `js/firebase.js` を本番値に書き換え
```javascript
const firebaseConfig = {
  apiKey:            "本番のAPIキー",
  authDomain:        "プロジェクトID.firebaseapp.com",
  projectId:         "プロジェクトID",
  storageBucket:     "プロジェクトID.appspot.com",
  messagingSenderId: "送信者ID",
  appId:             "アプリID"
};
```

### 3. Firestore セキュリティルール（推奨）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // アプリ
    match /apps/{appId} {
      allow read: if resource.data.status == "public";
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (request.auth.uid == resource.data.authorUid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
    }
    // ユーザー
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null &&
        (request.auth.uid == uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
    }
    // お知らせ
    match /notices/{noticeId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```

### 4. 管理者ユーザーの設定
Firestoreの `users/{uid}` ドキュメントの `role` フィールドを `"admin"` に変更してください。

### 5. GitHub + Vercel でデプロイ
1. GitHubリポジトリにプッシュ
2. Vercelでリポジトリを連携
3. 自動デプロイが開始されます

---

## 📊 Firestore データモデル

### `apps` コレクション
```typescript
{
  title:        string,           // アプリタイトル
  description:  string,           // 概要
  howto:        string | null,    // 使い方
  prompt:       string | null,    // AIプロンプト
  aiTool:       string | null,    // 使用AIツール
  tags:         string[],         // カテゴリタグ
  shareType:    "link" | "html",  // 共有方式
  appUrl:       string | null,    // リンク型URL
  htmlFileUrl:  string | null,    // HTMLファイルURL（Storage）
  thumbnailUrl: string | null,    // サムネイル画像URL
  authorUid:    string,           // 投稿者UID
  authorName:   string,           // 投稿者名
  authorPhoto:  string | null,    // 投稿者アイコン
  status:       "public" | "private" | "deleted",
  pickup:       boolean,          // ピックアップ表示
  pickupOrder:  number,           // ピックアップ表示順
  likeCount:    number,
  viewCount:    number,
  createdAt:    Timestamp,
  updatedAt:    Timestamp
}
```

### `users` コレクション
```typescript
{
  uid:         string,
  displayName: string,
  email:       string,
  photoURL:    string | null,
  role:        "user" | "admin",
  banned:      boolean,
  createdAt:   Timestamp
}
```

### `notices` コレクション
```typescript
{
  body:      string,     // お知らせ本文
  active:    boolean,    // 表示中かどうか
  createdAt: Timestamp
}
```

### `apps/{appId}/likes` サブコレクション
```typescript
{
  uid:       string,
  createdAt: Timestamp
}
```

---

## 🎨 デザインシステム

| 用途 | カラー |
|------|--------|
| ベース（紙色） | `#F5F3EE` |
| メインカラー（黒板色） | `#4A6741` |
| アクセント1（付箋） | `#E8B84B` マスタードイエロー |
| アクセント2（チョーク） | `#E8836A` サーモンピンク |

フォント：Zen Maru Gothic / Noto Sans JP（丸ゴシック体）

---

## 🔍 SEO 対策（実装済み）

| 対策 | 対象ページ | 内容 |
|------|-----------|------|
| `robots.txt` | 全体 | admin/submit/mypageをDisallow、sitemapを指定 |
| `sitemap.xml` | 全体 | 公開ページ＋カテゴリ別URLを記載 |
| `<meta name="description">` | 全ページ | 各ページ固有のdescription |
| `<meta name="keywords">` | index / apps | 主要キーワードを設定 |
| `<link rel="canonical">` | 公開ページ | 重複URLを防止 |
| OGP (Open Graph) | 全公開ページ | SNSシェア時のタイトル・説明・画像 |
| Twitter Card | 全公開ページ | summary_large_image形式 |
| `noindex, nofollow` | admin / submit / mypage | ログイン必須ページをクロール除外 |
| JSON-LD 構造化データ | index / apps / about / app-detail | WebSite・Organization・CollectionPage・SoftwareApplication・BreadcrumbList |
| 動的 OGP 更新 | app-detail.html | アプリデータ取得後にJSでtitle / description / OGP / JSON-LDを動的設定 |
| セマンティックHTML | 全ページ | `<header>`,`<nav>`,`<main>`,`<article>`,`<footer>` を使用 |
| `<h1>` 1件のみ | 全ページ | 各ページにh1を1つのみ配置 |

### デプロイ後に必要な作業

1. 公開URL: `https://sensei-app-tau.vercel.app/`（設定済み）
2. **Google Search Console** にサイトを登録し、`sitemap.xml` を送信
3. **OGP 画像** (`og:image`) を用意してindex.html / apps.htmlのOGPに追加（推奨：1200×630px）

---

## ❗ 未実装・今後の改善ポイント

- [ ] **全文検索の強化**：現状は Firestore の制限でタグ絞り込みのみ。Algolia / Typesense 等の導入推奨
- [ ] **コメント機能**：アプリ詳細ページへのコメント投稿
- [ ] **通報機能**：不適切なコンテンツの通報ボタン
- [ ] **プロフィールページ**：投稿者プロフィール閲覧
- [ ] **メール通知**：いいね・コメント通知
- [ ] **HTMLファイルのウイルスチェック**：アップロード時の安全性チェック（Cloud Functions利用）
- [ ] **OGP動的生成**：アプリごとのOGP画像
- [ ] **PWA対応**：Service Worker によるオフラインキャッシュ

---

## 📅 更新履歴

- **2025-05-24** 初期リリース（全ページ作成）

---

*© 2025 先生アプリ*
