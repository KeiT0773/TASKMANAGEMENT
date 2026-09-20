# backend

タスク管理アプリのバックエンド（Spring Boot）。

## 前提

- JDK 21 がインストールされていること（`java -version` で確認）
- Gradle のインストールは不要。同梱の Gradle Wrapper（`gradlew.bat`）が自動で取得する
- Docker Desktop が起動していること。バックエンドは起動時に PostgreSQL へ接続するため、**先に DB を起動しておく必要がある**

## 起動方法

### 1. データベースを起動する

リポジトリ直下（`backend/` の1つ上）で実行する。

```powershell
docker compose up -d
```

`docker compose ps` で `STATUS` が `Up (healthy)` になれば準備完了。

### 2. バックエンドを起動する

このディレクトリ（`backend/`）で実行する。

```powershell
# ビルドとテスト
.\gradlew build

# 起動
.\gradlew bootRun
```

停止は起動したターミナルで `Ctrl+C`。

> 初回は Gradle 本体と依存ライブラリのダウンロードが行われるため、数分かかる。

ポートは **8080 に固定**している（Spring Boot の既定。`server.port` は設定しない）。8080 が使用中のときは `Port 8080 was already in use` で起動に失敗する。その場合は、前に起動したバックエンドが残っているので、それを止めてから起動し直す（Git Bash）。

```bash
netstat -ano | grep ":8080" | grep LISTENING   # 最後の列が PID
taskkill //PID <PID> //F                        # そのプロセスを停止（Git Bash では // と書く）
./gradlew bootRun
```

`--server.port` などで別のポートに変えてはいけない。フロントエンドのプロキシが 8080 前提のため、別ポートでは画面から API に届かない。

### 3. 動作確認

| URL | 期待する応答 | 確認できること |
| --- | --- | --- |
| http://localhost:8080/api/health | `{"status":"ok"}` | サーバーが起動し、HTTP に応答できる |
| http://localhost:8080/api/health/db | `{"status":"ok","database":"PostgreSQL 16..."}` | バックエンドが実際に DB へ接続し、問い合わせを実行できる |
| http://localhost:8080/api/lists | リスト 3 件の JSON 配列 | `lists` テーブルの内容が API で取得できる |
| http://localhost:8080/api/cards | サンプルカード 6 件の JSON 配列（`?listId=todo` で絞り込み可） | `cards` テーブルの内容が API で取得できる |
| http://localhost:8080/api/cards/1 | カード 1 件の JSON（存在しない id は 404） | 1 件取得とエラー応答 |

`/api/health/db` がエラー（HTTP 500）になる場合は、DB が起動していないか、接続設定が `compose.yaml` と食い違っている。

## データベース接続

| 項目 | 値 |
| --- | --- |
| 接続先 | `jdbc:postgresql://localhost:5432/taskmanagement` |
| ユーザー名 / パスワード | `taskmanagement` / `taskmanagement` |
| 設定ファイル | `src/main/resources/application.properties` |
| DB 側の定義 | リポジトリ直下の `compose.yaml` |

接続情報はローカル開発専用のため、そのままリポジトリに含めている。サーバーへ配置する際は環境変数などに切り替える（技術スタック 8. 決定を保留する事項）。

テーブルの作成・変更は **Flyway だけが行う**（`spring.jpa.hibernate.ddl-auto=none`）。SQL ファイルは `src/main/resources/db/migration/` に `V1__xxx.sql` の形式で置き、アプリ起動時に自動で適用される。

> `.\gradlew build` に含まれる起動確認テストも DB へ接続するため、テスト実行前にも `docker compose up -d` が必要。

## 構成

```
backend/
├── build.gradle                 依存ライブラリとビルド設定
├── settings.gradle              プロジェクト名
├── gradlew / gradlew.bat        Gradle Wrapper（Gradle 本体を自動取得して実行する）
└── src/
    ├── main/
    │   ├── java/com/taskmanagement/backend/
    │   │   ├── BackendApplication.java   起動クラス（main メソッド）
    │   │   ├── HealthController.java     動作確認用 API（GET /api/health, /api/health/db）
    │   │   ├── list/                     リスト（BoardList: エンティティ、Repository、Response、Controller）
    │   │   ├── card/                     カード（Card: エンティティ、Repository、Service、Response、Controller、例外）
    │   │   └── common/                   GlobalExceptionHandler（例外 → ProblemDetail）
    │   └── resources/
    │       ├── application.properties    アプリ設定（DB 接続設定を含む）
    │       └── db/migration/             Flyway のマイグレーション SQL（V1: テーブル定義、V2: リスト初期データ、V3: サンプルカード）
    └── test/
        └── java/com/taskmanagement/backend/
            ├── BackendApplicationTests.java  起動確認テスト
            └── card/CardControllerTest.java  取得 API の統合テスト（実 DB に接続）
```

## 現在の状態

- Spring Web に加え、Spring Data JPA・Flyway・PostgreSQL ドライバを導入済み。バックエンドから DB へ接続できるところまで確認した。
- `db/migration/` に次の 2 ファイルを置き、起動時に Flyway が `lists` / `cards` テーブルとリストの初期データ 3 件（todo / doing / done）を作成する。定義の根拠は [データ設計書](../docs/data-design.md) 4.〜7. を参照。
  - `V1__create_list_and_card_tables.sql` — テーブル定義、制約、索引
  - `V2__insert_initial_lists.sql` — リストの初期データ
- `V3__insert_sample_cards.sql` で画面モックと同じサンプルカード 6 件を投入する（開発用。データ設計書 7.）。
- カード・リストの取得 API（`GET /api/lists`、`GET /api/cards`、`GET /api/cards/{id}`）を実装済み。仕様は [API 設計書](../docs/api-design.md) を参照。登録・更新・削除は未実装。

テーブルが作られたことは、次のコマンド（Git Bash）で確認できる。

```bash
docker exec taskmanagement-db psql -U taskmanagement -d taskmanagement -c '\dt'
docker exec taskmanagement-db psql -U taskmanagement -d taskmanagement -c 'select * from lists order by display_order'
```

API の動作は、バックエンドを起動した状態で別のターミナル（Git Bash）から確認できる。

```bash
curl http://localhost:8080/api/lists
curl "http://localhost:8080/api/cards?listId=todo"
curl -i http://localhost:8080/api/cards/999   # 404 と ProblemDetail
```
