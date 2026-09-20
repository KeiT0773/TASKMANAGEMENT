# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときに必ず従うルールを定義する。
人間向けの詳しい解説は [docs/development-workflow.md](docs/development-workflow.md) を参照。

---

## 1. プロジェクト概要

Trello 方式の個人用タスク管理アプリ。Web アプリケーション開発の流れ（要件定義 → 設計 → 実装）を実践的に学ぶことも目的の一つ。

| 文書 | 内容 |
| --- | --- |
| [要件定義書](docs/requirements.md) | 背景・目的、スコープ、非機能要件、制約、決定事項、受け入れ基準（上位文書） |
| [機能要件書](docs/functional-requirements.md) | 機能一覧と機能ごとの詳細（FR-01〜FR-09） |
| [画面要件書](docs/screen-requirements.md) | 画面一覧、画面構成、画面遷移、画面イメージ（SC-01, SC-02） |
| [データ要件書](docs/data-requirements.md) | データ項目の定義、ER図、データフロー図 |
| [データ設計書](docs/data-design.md) | テーブル定義、制約、初期データ、マイグレーション方針 |
| [API 設計書](docs/api-design.md) | REST API の一覧、共通方針、要求・応答の JSON 形式 |
| [フロントエンド設計書](docs/frontend-design.md) | コンポーネント構成、状態の持ち方、API 呼び出しの方針、表示ルール |
| [技術スタック](docs/tech-stack.md) | 各層で使用する言語・フレームワーク・周辺ツールの選定と理由 |
| [開発フロー](docs/development-workflow.md) | Issue・ブランチ・PR の運用ルール |

構成は `docs/`（要件定義書・設計書）、`mock/`（画面モック）、`backend/`（Spring Boot）、`frontend/`（React + Vite）、`compose.yaml`（ローカル開発用 PostgreSQL）。

---

## 2. 開発フロー（必須・例外なし）

コードや文書を変更するときは、**必ず**次の順序を踏むこと。

### 手順

```bash
# 1. Issue を起票する（Issue のない作業は始めない）
gh issue create

# 2. main を最新にしてからブランチを切る
git switch main
git pull --ff-only
git switch -c feat/12-card-create

# 3. 変更してコミットし、push する
git add <変更したファイル>
git commit -m "feat: カード登録機能を追加"
git push -u origin feat/12-card-create

# 4. PR を作る（本文に Closes #12 を必ず入れる）
gh pr create

# 5. squash マージする（マージ後、ブランチは自動削除される）
gh pr merge --squash
```

### 禁止事項

以下はローカルのフックと GitHub の Ruleset の両方でブロックされる。回避を試みてはならない。

- `main` ブランチ上でのコミット
- `main` ブランチへの直接 push
- force push（`git push --force`、`git push +...`）
- `main` へのローカル merge（マージは必ず GitHub 上の PR で行う）
- `main` ブランチの削除

### ブランチ命名規則

```
<種別>/<Issue番号>-<英小文字の要約>
```

| 種別 | 用途 |
| --- | --- |
| `feat` | 機能追加 |
| `fix` | バグ修正 |
| `docs` | 文書のみの変更 |
| `refactor` | 挙動を変えない内部改善 |
| `test` | テストの追加・修正 |
| `chore` | ビルド設定、依存関係、開発環境など |

例：`feat/12-card-create`、`fix/15-due-date-timezone`、`docs/18-add-api-spec`

要約部分は英小文字・数字・ハイフンのみ。次の正規表現に適合しない名前でブランチを作ろうとすると、ローカルのフックが拒否する。

```
^(feat|fix|docs|refactor|test|chore)/[0-9]+-[a-z0-9._-]+$
```

### コミットメッセージ

```
<種別>: <日本語の要約>
```

種別はブランチ名と同じ 6 種。要約は「何をしたか」を体言止めまたは「〜を追加/変更/修正」で書く。

例：`feat: カード登録機能を追加`、`docs: データ設計書にインデックス定義を追加`

必要なら空行を挟んで本文で理由を書く。Claude が作成したコミットには末尾に共著者行を入れる。

### PR

- タイトルは squash マージ後の main のコミットメッセージになるため、コミットメッセージと同じ規約で書く
- 本文には `Closes #<Issue番号>` を必ず入れる（マージ時に Issue が自動クローズされる）
- テンプレート [.github/pull_request_template.md](.github/pull_request_template.md) の項目を埋める
- 承認者は不要（ソロ開発のため）だが、PR を経由すること自体は必須

---

## 3. ユーザーに渡すコマンドの書き方

**ユーザーが自分で打つコマンドは Git Bash 構文で書くこと。**

ユーザーは Cursor のターミナルパネルで Git Bash を使っている。セッション環境が PowerShell を報告することがあるが、それはツールが使えるシェルであって、ユーザーが実際に触っているシェルではない。

| 正しい（Git Bash） | 誤り（PowerShell/cmd） |
| --- | --- |
| `./gradlew bootRun` | `.\gradlew bootRun` |
| `cd backend/src` | `cd backend\src` |
| `curl http://localhost:8080/api/health` | `curl.exe ...` |

既存の [README.md](README.md) と [backend/README.md](backend/README.md) は PowerShell 構文で書かれた箇所が残っており、ユーザーの実態と合っていない。これらを引用するときは Git Bash 構文に読み替えて渡すこと。

シェルによって内容が変わるコマンドを書くときは、どちらのシェル向けかを明記する。

### Git Bash から `gh api` を使うときの注意

Git Bash（MSYS）はスラッシュで始まる引数を Windows のパスとして書き換えてしまう。`gh api` のエンドポイントは **先頭のスラッシュを省く**こと。

```bash
gh api repos/KeiT0773/TASKMANAGEMENT/rulesets   # 正しい
gh api /repos/KeiT0773/TASKMANAGEMENT/rulesets  # invalid API endpoint エラーになる
```

---

## 4. ローカル環境

```bash
# 1. データベース（リポジトリルートで実行）
docker compose up -d

# 2. バックエンド
cd backend
./gradlew bootRun

# 3. フロントエンド（別のターミナルで）
cd frontend
npm run dev
```

画面は http://localhost:5173 。バックエンドの動作確認は http://localhost:8080/api/health/db 。詳細は [backend/README.md](backend/README.md)、[frontend/README.md](frontend/README.md) を参照。

---

## 5. 文書を変更するときの約束

`docs/` 配下の文書には文書情報テーブルと変更履歴テーブルがある。内容を変更したときは、**版数・最終更新日・変更履歴の 3 つを必ず更新する**こと。版数は軽微な追記なら小数点以下を、構成の変更を伴うなら整数部を上げる。
