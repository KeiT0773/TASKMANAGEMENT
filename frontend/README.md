# frontend

タスク管理アプリのフロントエンド（React + TypeScript + Vite）。

コマンドはすべて **Git Bash** 向けに書いている。

## 前提

- Node.js（LTS）がインストールされていること（`node -v` で確認。開発時は v24 系）
- バックエンドが `http://localhost:8080` で起動していること。画面は API からデータを取得するため、**先に DB とバックエンドを起動しておく必要がある**（起動方法は [backend/README.md](../backend/README.md)）

## 起動方法

### 1. 依存ライブラリを入れる（初回、および `package.json` が変わったとき）

このディレクトリ（`frontend/`）で実行する。

```bash
npm install
```

### 2. 開発サーバーを起動する

```bash
npm run dev
```

http://localhost:5173 をブラウザで開く。ソースを保存すると画面が自動で更新される。停止は起動したターミナルで `Ctrl+C`。

ポートは **5173 に固定**している（`vite.config.ts` の `strictPort: true`）。5173 が使用中のときは、別のポートへ移らずに `Port 5173 is already in use` で起動に失敗する。その場合は、前に起動した開発サーバーが残っているので、それを止めてから起動し直す（Git Bash）。

```bash
netstat -ano | grep ":5173" | grep LISTENING   # 最後の列が PID
taskkill //PID <PID> //F                        # そのプロセスを停止（Git Bash では // と書く）
npm run dev
```

`--port` で別のポートを指定してはいけない。プロキシや README の URL が 5173 前提のため、別ポートでは正しく動作確認できない。

### 3. 動作確認

| URL                              | 期待する表示                                                     | 確認できること                                                                   |
| -------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| http://localhost:5173            | ボード画面（未着手 / 作業中 / 完了の 3 列とサンプルカード 6 枚） | 開発サーバーが起動し、バックエンドから取得したデータが描画されている             |
| http://localhost:5173/api/health | `{"status":"ok"}`                                                | 開発サーバーがバックエンドへ要求を転送できている（下記「バックエンドへの接続」） |

`/api/health` が `502` や `ECONNREFUSED` になる場合は、バックエンドが起動していない。

## npm スクリプト

| コマンド          | 内容                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `npm run dev`     | 開発サーバーを起動する                                                |
| `npm run build`   | 型チェック（`tsc -b`）のあと、配布用ファイルを `dist/` に出力する     |
| `npm run preview` | `dist/` の内容を確認用に配信する                                      |
| `npm run lint`    | oxlint でコードを検査する                                             |
| `npm run format`  | Prettier でコードを整形する（`format:check` は整形せず確認だけ）      |
| `npm test`        | Vitest でテストを 1 回実行する（`test:watch` は変更を監視して再実行） |

## バックエンドへの接続

開発サーバー（Vite）は、`/api` で始まる要求を `http://localhost:8080` へ転送する（`vite.config.ts` の `server.proxy`）。フロントエンドのコードは `fetch('/api/cards')` のように相対パスで API を呼ぶだけでよく、バックエンド側に CORS の設定は要らない。理由は [フロントエンド設計書](../docs/frontend-design.md) 9. を参照。

```
ブラウザ ──GET /api/cards──▶ Vite 開発サーバー (5173) ──転送──▶ Spring Boot (8080)
```

## 構成

```
frontend/
├── index.html                  Vite のエントリ HTML
├── vite.config.ts              開発サーバー（プロキシ）とテストの設定
├── package.json                依存ライブラリと npm スクリプト
├── tsconfig*.json              TypeScript の設定（app: src/ 用、node: vite.config.ts 用）
├── .oxlintrc.json              oxlint の設定
├── .prettierrc                 Prettier の設定
└── src/
    ├── main.tsx                React の起動（App を DOM に描画）
    ├── App.tsx                 画面全体（AppHeader + Board）
    ├── index.css               グローバルスタイル（* と body のみ）
    ├── types/board.ts          API の応答に対応する型（Priority, ListId, BoardList, Card）
    ├── api/                    client.ts（apiGet, ApiError）、lists.ts、cards.ts
    ├── hooks/useBoard.ts       リストとカードの取得と、読み込み状態の保持
    ├── utils/date.ts           日付の書式変換と期限超過の判定（+ テスト）
    ├── constants/priority.ts   優先度の表示名
    ├── components/
    │   ├── AppHeader/          ヘッダー
    │   ├── Board/              ボード（3 列の親。読み込み中・エラーの表示。+ テスト）
    │   ├── BoardList/          1 つのリスト（列）
    │   ├── Card/               1 枚のカード（+ テスト）
    │   └── PriorityBadge/      優先度の色付きバッジ
    └── test/setup.ts           テストの共通設定
```

各コンポーネントの責務と props、状態の持ち方は [フロントエンド設計書](../docs/frontend-design.md) を参照。

## 現在の状態

- ボード画面（SC-01）の表示を実装済み。起動時に `GET /api/lists` と `GET /api/cards` を呼び、3 つの列にカードを並べる。各カードには優先度バッジ（高 / 中 / 低）、タイトル、期限（`期限 MM/DD`）を表示し、期限を過ぎたカードは「（期限切れ）」付きの赤字にする（完了列のカードは除く）。
- バックエンドに接続できないときは、ボードの代わりに「サーバーに接続できません」の文言を表示する。
- カードの登録・編集・削除・移動、カード詳細（SC-02）は未実装（バックエンドに書き込み API が無いため）。
