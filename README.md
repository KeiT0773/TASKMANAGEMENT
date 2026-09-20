# TaskManagement

Trello 方式の個人用タスク管理アプリ。

## ドキュメント

| 文書 | 内容 |
| --- | --- |
| [要件定義書](docs/requirements.md) | 背景・目的、スコープ、非機能要件、制約、決定事項、受け入れ基準（上位文書） |
| [機能要件書](docs/functional-requirements.md) | 機能一覧と機能ごとの詳細（FR-01〜FR-09） |
| [画面要件書](docs/screen-requirements.md) | 画面一覧、画面構成、画面遷移、画面イメージ（SC-01, SC-02） |
| [データ要件書](docs/data-requirements.md) | データ項目の定義、ER図、データフロー図 |
| [データ設計書](docs/data-design.md) | テーブル定義、制約、初期データ、マイグレーション方針（基本設計） |
| [API 設計書](docs/api-design.md) | REST API の一覧、共通方針、要求・応答の JSON 形式（基本設計） |
| [フロントエンド設計書](docs/frontend-design.md) | コンポーネント構成、状態の持ち方、API 呼び出しの方針、表示ルール（基本設計） |
| [技術スタック](docs/tech-stack.md) | 各層で使用する言語・フレームワーク・周辺ツールの選定と理由 |
| [開発フロー](docs/development-workflow.md) | Issue・ブランチ・PR の運用ルール、main ブランチの保護設定 |

## ディレクトリ構成

| ディレクトリ・ファイル | 内容 |
| --- | --- |
| [docs/](docs/) | 要件定義書・設計書 |
| [mock/](mock/) | 画面モック（要件確認用） |
| [backend/](backend/) | Spring Boot アプリケーション。起動方法は [backend/README.md](backend/README.md) を参照 |
| [compose.yaml](compose.yaml) | ローカル開発用 PostgreSQL の定義（Docker Compose） |
| [CLAUDE.md](CLAUDE.md) | Claude Code がこのリポジトリで従う開発ルール |
| [.github/](.github/) | Issue テンプレート・PR テンプレート |

## ローカル環境の起動

```bash
# 1. データベース（このディレクトリで実行）
docker compose up -d

# 2. バックエンド
cd backend
./gradlew bootRun
```

動作確認は http://localhost:8080/api/health/db 。詳細は [backend/README.md](backend/README.md) を参照。

## 開発の進め方

コードや文書を変更するときは、必ず Issue の起票から始め、ブランチを切って Pull Request 経由で `main` に反映する。`main` への直接 push は GitHub 側の設定で拒否される。

```bash
gh issue create                              # 1. Issue を起票
git switch main && git pull --ff-only        # 2. main を最新化
git switch -c feat/12-card-create            # 3. ブランチを作成
git push -u origin feat/12-card-create       # 4. push
gh pr create                                 # 5. PR を作成（Closes #12 を記載）
```

詳細は [開発フロー](docs/development-workflow.md) を参照。
