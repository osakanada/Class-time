# 文化祭タイムアタック計測アプリ（Cloudflare Pages版）

参加者ごとにスタート→ゴールで計測し、上位3名をリアルタイムにランキング表示する文化祭向けアプリです。

## 構成

```
cf-app/
├── index.html              # フロントエンド本体（役割選択・スタート・ゴール・ランキング・パスワードゲート）
├── functions/
│   └── api/
│       └── state.js        # Cloudflare Pages Functions。GET/POSTで race-state をKVに読み書き
└── wrangler.toml            # プロジェクト設定・KVバインディング定義
```

## 事前準備

- Node.js（v18以上推奨）と npm
- Cloudflareアカウント（無料枠でOK）

## デプロイ手順

1. Wrangler CLIをインストール

   ```bash
   npm install -g wrangler
   ```

2. Cloudflareにログイン（ブラウザが開いて認証します）

   ```bash
   wrangler login
   ```

3. KV Namespaceを作成

   ```bash
   cd cf-app
   wrangler kv namespace create RACE_KV
   ```

   実行すると以下のような出力が得られます。

   ```
   [[kv_namespaces]]
   binding = "RACE_KV"
   id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

   発行された `id` を `wrangler.toml` の `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` と置き換えてください。

4. デプロイ

   ```bash
   wrangler pages deploy . --project-name=bunkasai-timer
   ```

   初回はPagesプロジェクトの作成確認などが表示されるので、指示に従って進めてください。
   完了すると `https://bunkasai-timer.pages.dev` のようなURLが発行されます。

5. 動作確認チェックリスト

   - [ ] 発行されたURLにアクセスし、役割選択画面が表示される
   - [ ] 「ランキング表示」はパスワードなしで見られる
   - [ ] 「スタート端末」「ゴール端末」は運営パスワード（デフォルト: `2026202`）を要求される
   - [ ] スタート端末で参加者を追加 → ゴール端末でゴール確定 → ランキング表示に反映される（ポーリング間隔的に1〜2秒の遅延は正常）
   - [ ] `<デプロイURL>/?role=rank` でランキング表示に直接アクセスできる（プロジェクター用の固定URLとして利用可）

## 運営パスワードの変更

`index.html` 内の `OPERATOR_PASSWORD` 定数を変更してください。

```js
const OPERATOR_PASSWORD = '2026202';
```

クライアント側の簡易的な制限であり、ソースを見れば誰でもパスワード文字列を確認できます。「知らない人が偶然操作しない」程度の抑止力として設計されています。本格的なセキュリティ用途には使用しないでください。

## 再デプロイ

コード変更後は、`cf-app` ディレクトリ内で以下を実行するだけで再デプロイできます。

```bash
wrangler pages deploy . --project-name=bunkasai-timer
```

## 当日の運用に関する注意

- KVは無料枠に書き込み回数の上限があります（目安: 1日1,000書き込み程度）。1回のスタート／ゴール操作につき1〜2回の書き込みが発生するため、参加者数が非常に多い場合は有料プランへの切り替えを検討してください。
- 複数のゴール端末で同時に同じ参加者の「ゴール」を押すと、稀に重複記録される可能性があります。基本的には1台のゴール端末での運用を推奨します。
- 同着（同タイム）のUIは未実装です。表示順が入れ替わることがあります。
- 文化祭終了後にデータをリセットするには、運営フッターの「全データをリセット」ボタンを使うか、CloudflareのKVダッシュボードから `race-state` キーを削除してください。
