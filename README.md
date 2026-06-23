# ActMap — リアルタイム活動マップ

今、近くで何してる？活動を地図上でリアルタイムシェアして、近くの人と一緒に動こう。

## 機能

- 🔐 Googleログイン（Supabase Auth）
- 📍 現在地取得・地図表示（Leaflet + OpenStreetMap）
- 🏃 活動開始（カテゴリ選択・最大2時間で自動終了）
- 🗺️ リアルタイム地図（Supabase Realtime）
- 🙋 参加リクエスト
- 💬 承認済みメンバー間チャット

## セットアップ

### 1. Supabase プロジェクト作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、`supabase-schema.sql` を SQL Editor で実行してください。

### 2. Google OAuth 設定

Supabase ダッシュボード → **Authentication → Providers → Google** を有効化。

[Google Cloud Console](https://console.cloud.google.com) で：
1. OAuth 2.0 クライアントID を作成
2. 承認済みリダイレクト URI に `https://<your-project>.supabase.co/auth/v1/callback` を追加
3. クライアントID / シークレットを Supabase に入力

### 3. 環境変数設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Supabase ダッシュボード → **Settings → API** で確認できます。

### 4. Realtime 有効化

Supabase ダッシュボード → **Database → Replication** で以下のテーブルを有効化：
- `activities`
- `messages`
- `join_requests`

### 5. 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Next.js 15 + TypeScript |
| スタイリング | Tailwind CSS v4 |
| 地図 | Leaflet + react-leaflet |
| バックエンド | Supabase (Auth / DB / Realtime) |
| 認証 | Google OAuth |

## 活動カテゴリ

🏀 バスケ / ⚽ サッカー / 🎾 テニス / 🏃 ランニング / 📚 勉強 / ☕ カフェ作業 / 🚴 サイクリング / 🧘 ヨガ / ⚡ その他

## データベース構成

```
profiles        ← auth.users に連動
activities      ← 活動（最大2時間、自動終了）
join_requests   ← 参加リクエスト（pending/accepted/declined）
messages        ← チャット（承認済みメンバーのみ）
```

## 今後の改善案（v2）

- [ ] プッシュ通知（参加リクエスト承認時）
- [ ] 活動の参加人数上限設定
- [ ] 距離フィルター（半径○km以内）
- [ ] 活動履歴・統計
- [ ] 友達機能
