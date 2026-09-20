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

### 3. 動作確認

| URL                              | 期待する表示                 | 確認できること                                                                   |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| http://localhost:5173            | ヘッダー「タスク管理ボード」 | 開発サーバーが起動し、React が描画されている                                     |
| http://localhost:5173/api/health | `{"status":"ok"}`            | 開発サーバーがバックエンドへ要求を転送できている（下記「バックエンドへの接続」） |

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
    ├── App.tsx                 画面全体
    ├── App.module.css          App のスタイル（CSS Modules）
    ├── index.css               グローバルスタイル（* と body のみ）
    └── test/
        └── setup.ts            テストの共通設定
```

実装が進んだあとの構成は [フロントエンド設計書](../docs/frontend-design.md) 3. を参照。

## 現在の状態

- Vite の `react-ts` テンプレートを雛形として生成し、サンプル画面を削除してヘッダーだけの最小構成にした。
- バックエンドへのプロキシ、Prettier、Vitest + React Testing Library を設定済み（テストはまだ無い）。
- ボード画面（リストとカードの表示）は未実装。
