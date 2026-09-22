# タスク管理アプリ 技術スタック

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ 技術スタック |
| 版数 | 1.7 |
| 作成日 | 2026-09-13 |
| 最終更新日 | 2026-09-22 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 上位文書 | [要件定義書](requirements.md) |
| 関連文書 | [機能要件書](functional-requirements.md)、[画面要件書](screen-requirements.md)、[データ要件書](data-requirements.md) |

本書は、要件定義書 2.4 で「基本設計で決定する」とした、各層で使用する技術（プログラミング言語、フレームワーク、データベース製品、周辺ツール）を定義する。

### 1.1 変更履歴

| 版数 | 日付 | 変更内容 | 変更者 |
| --- | --- | --- | --- |
| 1.0 | 2026-09-13 | 初版作成 | KeiT0773 |
| 1.1 | 2026-09-13 | バックエンドのひな形作成に伴い Spring Boot のバージョン（4.1.1）と Gradle のバージョン（9.7.1）を確定 | KeiT0773 |
| 1.2 | 2026-09-15 | PostgreSQL 接続設定の追加に伴い、DB・Docker のバージョンを確定。Flyway の導入方法（Spring Boot 4 では専用スターターが必要）を補記 | KeiT0773 |
| 1.3 | 2026-09-20 | フロントエンドの雛形作成に伴い、Node.js・Vite・React・TypeScript・Vitest のバージョンを確定。コード検査は Vite 8 の雛形に同梱される oxlint に変更（ESLint は同梱されなくなったため）。開発時のバックエンド接続方式（Vite のプロキシ）を追記 | KeiT0773 |
| 1.4 | 2026-09-21 | React のバージョンを実際にインストールされた 19.3 に修正。TypeScript 7 が公開済みだが Vite の雛形に合わせて 6.0 系を据え置く方針と、追従の時期を追記 | KeiT0773 |
| 1.5 | 2026-09-21 | スタイルの行に、CSS Modules の提供元（Vite 同梱）、処理系、使用できる CSS 機能の基準（Vite の既定ターゲットと対応ブラウザ）を追記。CSS 自体に版数が無いことを明記 | KeiT0773 |
| 1.6 | 2026-09-21 | ドラッグ&ドロップの導入に伴い、`@hello-pangea/dnd` のバージョン（18.0）、`react-beautiful-dnd` との関係、React 19・StrictMode への対応を追記 | KeiT0773 |
| 1.7 | 2026-09-22 | 全体品質チェックの結果を反映。バックエンドに「コード検査」（Checkstyle + javac `-Xlint`）を追加。API 仕様書ツール（springdoc-openapi）は導入しない方針に改訂。フロントエンドの「コード検査・整形」に `react/exhaustive-deps`・`--deny-warnings`・改行コード LF 統一を追記 | KeiT0773 |

---

## 2. 選定方針

- バックエンドは **Java + Spring Boot**、フロントエンドは **React**、データベースは **PostgreSQL** を使用する（プロジェクト方針として指定）。Next.js は使用しない。
- 周辺ツールは、上記のフレームワーク・言語と組み合わせるうえで標準的で、学習資料が豊富なものを選ぶ。
- 本プロジェクトは Web アプリケーション開発の学習も目的とする（要件定義書 2.1）ため、構成をなるべく単純に保ち、必要になるまでライブラリを追加しない。

---

## 3. バックエンド

| 項目 | 選定 | 役割・選定理由 |
| --- | --- | --- |
| 言語 | Java 21（LTS） | 長期サポート版であり、教材・記事が最も多い |
| フレームワーク | Spring Boot 4.1.1 | プロジェクト方針として指定。雛形作成時（2026-09-13）の Spring Initializr の最新安定版 |
| ビルドツール | Gradle 9.7.1（Gradle Wrapper） | ソースのコンパイル、依存ライブラリの取得、実行ファイルの作成を行う。Wrapper を同梱するため Gradle 本体のインストールは不要 |
| REST API | Spring Web | フロントエンドからの HTTP 要求を受け付け、JSON で応答する |
| DB アクセス | Spring Data JPA | Java のクラスとテーブルを対応づけ、SQL を直接書かずに読み書きする。Spring Boot の標準的な組み合わせ |
| 入力チェック | Bean Validation | 「タイトルが空なら登録しない」（FR-01）などの検証をアノテーションで宣言する |
| DB マイグレーション | Flyway 12.4.0 | テーブル定義の変更を SQL ファイルとして履歴管理し、アプリ起動時に自動で DB へ反映する。Spring Boot 4 は自動設定がモジュールに分かれているため、`flyway-core` 単体ではなく `spring-boot-starter-flyway` を依存に加える必要がある（加えて PostgreSQL 用の `flyway-database-postgresql`） |
| API 仕様書 | 導入しない（[API 設計書](api-design.md) を正として手で保守する） | 当初は springdoc-openapi（Swagger UI）を候補としていたが、API は 8 本で FR-01〜FR-10 の分が揃って安定しており、設計書を手で保守できる範囲にとどまる。依存を増やさない方針（2.）を優先し、導入しないことを確定した（API 設計書 決定事項 No.21） |
| コード検査 | Checkstyle 14.1 + javac `-Xlint:all -Werror` | フロントエンドの oxlint に相当する機械的なチェック。Checkstyle は Gradle に同梱のプラグインで、ルールは `backend/config/checkstyle/checkstyle.xml`（未使用 import、波括弧の省略、`equals` / `hashCode` の片方だけの定義など、明らかな誤りに絞った独自ルール。google_checks / sun_checks は雛形のタブ・Javadoc 任意と衝突するため使わない）。javac は全警告を有効にし、警告があればコンパイルを失敗させる（`serial` のみ除外）。どちらも `./gradlew check` で実行される |
| テスト | JUnit 5 + Spring Boot Test | Spring Boot に同梱。追加の選定は不要 |

---

## 4. フロントエンド

| 項目 | 選定 | 役割・選定理由 |
| --- | --- | --- |
| ライブラリ | React 19.3 | プロジェクト方針として指定。`package.json` の指定は `^19.2.8`（マイナー更新まで許可）で、`npm install` 時点の最新 19.3.0 が入っている |
| 言語 | TypeScript 6.0 | API がやり取りするデータ（カード・リスト）の形を型として定義でき、バックエンドとの食い違いを早期に検出できる。npm の最新は 7.0（コンパイラを Go で書き直した大きな節目）だが、Vite の雛形が `~6.0.2`（パッチ更新のみ）で固定しており、周辺ツールの追従も揃っていないため 6.0 系を据え置く。Vite の雛形（`npm create vite@latest`）が 7 を採用した時点で追従する |
| ビルド・開発サーバー | Vite 8.3 | Next.js を使わない場合の標準的な選択。起動が速く、初期設定がほぼ不要。`react-ts` テンプレートで雛形を生成した |
| バックエンドへの接続（開発時） | Vite の開発サーバーのプロキシ | `/api` で始まる要求を `http://localhost:8080` へ転送する。バックエンドに CORS 設定を追加せずに済み、将来同じサーバーから配信する形（API 設計書 2. 方針 1）と整合する。詳細は [フロントエンド設計書](frontend-design.md) 9. |
| ドラッグ&ドロップ | @hello-pangea/dnd 18.0 | 「列の間でカードを動かす」用途に特化しており、カンバン UI の実装例が豊富（FR-04, FR-05）。Atlassian が開発を終了した `react-beautiful-dnd` をコミュニティが引き継いだもので、API は同じ。18.0 で React 19 に対応（`peerDependencies` は `^18 \|\| ^19`）し、React の `StrictMode` でも動作する。`package.json` の指定は `^18.0.1` |
| サーバー通信 | fetch API（ブラウザ標準） | 想定データ量（カード100件程度）・利用者1名の規模では追加ライブラリを必要としない |
| スタイル | CSS（CSS Modules、Vite 8.3 同梱） | 画面モック（`mock/style.css`）をほぼそのまま流用できる。CSS Modules は Vite が標準で処理する（内部で `postcss-modules` 9 を使用。追加パッケージ無し）。処理系は Vite の既定の postcss 8 で、Sass などのプリプロセッサや UI ライブラリは使わない。CSS 自体には版数が無い（CSS3 以降は仕様がモジュール単位で改訂されるため）。使用できる CSS 機能の基準は Vite の既定ターゲット `baseline-widely-available`（2026-01-01 時点：Chrome 111+ / Edge 111+ / Firefox 114+ / Safari 16.4+）とし、[要件定義書](requirements.md) 7. の対応ブラウザ（Chrome・Edge の最新版）を満たす |
| コード検査・整形 | oxlint + Prettier 3 | Vite 8 の `react-ts` テンプレートは ESLint ではなく oxlint（Rust 製で高速、設定は `.oxlintrc.json`）を同梱するため、雛形に従う。整形は Prettier を追加した。ESLint の方が資料は多いが、本プロジェクトの規模では雛形の構成をそのまま使う方が単純（2. 選定方針）。雛形の設定に加えて `react/exhaustive-deps`（`useEffect` 等の依存配列の漏れ）を `error` にし、`npm run lint` は `--deny-warnings` で warning もエラー扱いにする（ESLint 時代の `react-hooks` recommended と同じ範囲）。改行コードはリポジトリ直下の `.gitattributes` と `.editorconfig` で LF に統一し、Prettier の既定（`endOfLine: lf`）と一致させる。lint・整形・型検査・テストは `npm run check` で一括実行できる |
| テスト | Vitest 5 + React Testing Library 16 | Vite と相性のよい標準的な組み合わせ。DOM の再現には jsdom を使う |
| パッケージ管理 | npm 11 | Node.js に同梱。追加インストール不要 |

---

## 5. データベース

| 項目 | 選定 | 役割・選定理由 |
| --- | --- | --- |
| 製品 | PostgreSQL 16 系 | プロジェクト方針として指定。安定版 |
| ローカルでの起動 | Docker Desktop + Docker Compose | PC に PostgreSQL を直接インストールせず、コマンド一つで起動・破棄できる |

---

## 6. 開発環境

| 項目 | 選定 | 備考 |
| --- | --- | --- |
| OS | Windows 11 | 要件定義書 5.1 の想定端末と同じ |
| エディタ | Cursor | Java / Spring Boot 用の拡張機能を追加する |
| 必要なインストール | JDK 21、Node.js 24（LTS）、Docker Desktop | 実装開始前に導入する。Node.js は雛形作成時点で v24.20.0 |
| バージョン管理 | Git + GitHub | 既存のリポジトリを継続して使用する |

---

## 7. リポジトリ構成

1つのリポジトリにドキュメント・バックエンド・フロントエンドをまとめて管理する。

```
TaskManagement/
├── docs/        要件定義書・設計書
├── mock/        画面モック（要件確認用）
├── backend/     Spring Boot アプリケーション
└── frontend/    React アプリケーション
```

---

## 8. 決定を保留する事項

| 事項 | 保留理由 | 決定時期 |
| --- | --- | --- |
| サーバーの配置先（クラウドサービス等） | まずローカル環境で動作するものを完成させてから選定しても遅くない | ローカルでの実装完了後 |
