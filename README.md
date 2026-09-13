# TaskManagement

Trello 方式の個人用タスク管理アプリ。

## ドキュメント

| 文書 | 内容 |
| --- | --- |
| [要件定義書](docs/requirements.md) | 背景・目的、スコープ、非機能要件、制約、決定事項、受け入れ基準（上位文書） |
| [機能要件書](docs/functional-requirements.md) | 機能一覧と機能ごとの詳細（FR-01〜FR-09） |
| [画面要件書](docs/screen-requirements.md) | 画面一覧、画面構成、画面遷移、画面イメージ（SC-01, SC-02） |
| [データ要件書](docs/data-requirements.md) | データ項目の定義、ER図、データフロー図 |
| [技術スタック](docs/tech-stack.md) | 各層で使用する言語・フレームワーク・周辺ツールの選定と理由 |

## ディレクトリ構成

| ディレクトリ | 内容 |
| --- | --- |
| [docs/](docs/) | 要件定義書・設計書 |
| [mock/](mock/) | 画面モック（要件確認用） |
| [backend/](backend/) | Spring Boot アプリケーション。起動方法は [backend/README.md](backend/README.md) を参照 |
