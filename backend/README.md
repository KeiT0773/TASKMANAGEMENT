# backend

タスク管理アプリのバックエンド（Spring Boot）。

## 前提

- JDK 21 がインストールされていること（`java -version` で確認）
- Gradle のインストールは不要。同梱の Gradle Wrapper（`gradlew.bat`）が自動で取得する

## 起動方法

このディレクトリ（`backend/`）で実行する。

```powershell
# ビルドとテスト
.\gradlew build

# 起動
.\gradlew bootRun
```

起動後、ブラウザで http://localhost:8080/api/health を開き、`{"status":"ok"}` と表示されれば成功。

停止は起動したターミナルで `Ctrl+C`。

> 初回は Gradle 本体と依存ライブラリのダウンロードが行われるため、数分かかる。

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
    │   │   └── HealthController.java     動作確認用 API（GET /api/health）
    │   └── resources/
    │       └── application.properties    アプリ設定
    └── test/
        └── java/com/taskmanagement/backend/
            └── BackendApplicationTests.java  起動確認テスト
```

## 現在の状態

- Spring Web のみ。データベース接続（PostgreSQL / Spring Data JPA / Flyway）は Docker Desktop 導入後に追加する。
