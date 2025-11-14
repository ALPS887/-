# LIME - リアルタイムチャットアプリ

LIME風のデザインを採用した、他デバイス間で通信可能なリアルタイムチャットアプリです。

## 主な機能

✨ **リアルタイムメッセージング**
- Firebaseを使用した他デバイス間でのリアルタイム通信
- メッセージの即時送受信

👥 **グループチャット**
- グループの作成と参加
- 招待コードによる簡単な参加システム
- 複数人でのチャットが可能

🎨 **LIME風デザイン**
- 緑色をベースにした明るく親しみやすいUI
- レスポンシブデザイン対応（PC・スマホ両対応）
- アニメーション効果

👤 **プロフィール設定**
- 名前とアバターのカスタマイズ
- 絵文字アバターから選択可能

## セットアップ方法

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト設定から以下の情報を取得:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### 2. Firebaseの設定

1. Firebase Consoleで「Authentication」を有効化
   - 「Sign-in method」タブから「匿名」を有効にする

2. Firestoreデータベースを作成
   - 「Firestore Database」を作成
   - テストモードで開始（後でルールを設定）

3. Firestoreのセキュリティルールを設定:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザードキュメント
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // グループドキュメント
    match /groups/{groupId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid in resource.data.members;

      // グループ内のメッセージ
      match /messages/{messageId} {
        allow read: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
        allow create: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
      }
    }
  }
}
```

### 3. アプリのインストールと起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで表示されるURLにアクセスし、Firebase設定情報を入力してください。

## 使い方

### 初回セットアップ

1. アプリを起動
2. Firebase設定情報を入力
3. プロフィール（名前とアバター）を設定

### グループチャットの開始

**グループを作成する場合:**
1. 「グループ作成」ボタンをクリック
2. グループ名を入力
3. 表示される招待コードを共有

**グループに参加する場合:**
1. 「グループ参加」ボタンをクリック
2. 受け取った6桁の招待コードを入力

### メッセージの送信

1. グループを選択してチャット画面を開く
2. 下部の入力欄にメッセージを入力
3. 送信ボタン（➤）をクリックまたはEnterキーを押す

## 技術スタック

- **フロントエンド**: React + Vite
- **バックエンド**: Firebase
  - Authentication（匿名認証）
  - Firestore（リアルタイムデータベース）
  - Storage（将来の拡張用）
- **スタイリング**: CSS3（カスタムプロパティ使用）

## ファイル構成

```
line-chat-app/
├── src/
│   ├── components/
│   │   ├── FirebaseSetup.jsx  # Firebase設定画面
│   │   ├── ProfileSetup.jsx   # プロフィール設定画面
│   │   ├── GroupList.jsx      # グループ一覧画面
│   │   └── Chat.jsx           # チャット画面
│   ├── firebase.js            # Firebase設定
│   ├── App.jsx                # メインアプリ
│   ├── App.css                # スタイリング
│   └── main.jsx               # エントリーポイント
└── package.json
```

## 今後の拡張予定

- [ ] ダイレクトメッセージ機能
- [ ] 画像・ファイル送信
- [ ] スタンプ機能
- [ ] リアクション機能
- [ ] 既読機能
- [ ] タイムライン機能
- [ ] Keep（メモ）機能
- [ ] ダークモード

## ライセンス

MIT

## 開発者

Created with Claude Code
