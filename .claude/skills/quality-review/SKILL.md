---
name: quality-review
description: このプロジェクトの実装を品質チェック・レビューする手順とチェックリスト。「品質チェックして」「レビューして」「標準から外れていないか見て」「文書と実装が合っているか確認して」と頼まれたとき、および PR を作る前のセルフレビューで必ず使う。機械チェック → 文書との突き合わせ → 標準からのずれ、の順で確認し、結果を 3 区分で報告する。
---

# 品質レビューの手順

このプロジェクト（Spring Boot 4 / React 19 / PostgreSQL 16）の実装を、**機械チェック → 文書との突き合わせ → 標準（デファクト）からのずれ** の順で確認する。文書と実装が食い違っていたら **文書を正** として実装を直す（文書どうしが矛盾しているときは 2. の末尾を参照）。

## 1. 機械チェックを回す（Git Bash）

```bash
# フロントエンド：lint（warning もエラー）→ Prettier → tsc → Vitest
cd frontend && npm run check

# バックエンド：Checkstyle → javac -Xlint:all -Werror → テスト（PostgreSQL が必要）
docker compose up -d                 # リポジトリルート
cd backend && ./gradlew check
```

| チェック | 合格条件 | 落ちたとき |
| --- | --- | --- |
| `oxlint --deny-warnings` | 0 件 | ルールを緩めるのではなくコードを直す。`react/exhaustive-deps` の指摘は依存配列の漏れなので必ず直す |
| `prettier --check` | 全通過 | `npm run format`。改行が原因なら 5. の「改行コード」を確認 |
| `tsc -b` | 0 件 | TS 6 は `strict` が既定で有効。`any` や `!` で黙らせない |
| `vitest run` | 全通過 | 新しい振る舞いにはテストを足す。「修正前に落ち、修正後に通る」ことを確認する |
| Checkstyle | 0 件（`build/reports/checkstyle/`） | 既存コードと衝突するルールならルール側を直してよいが、`NeedBraces` / `UnusedImports` 等の明らかな改善はコードを直す |
| `-Werror` | コンパイル成功 | 警告の原因を直す。`@SuppressWarnings` は理由をコメントに書く |

Docker Desktop が止まっていて DB を起動できないときは、スキル `start-dev-servers` の手順に従う。DB 無しではバックエンドのテストは実行できない（`BackendApplicationTests` も実 DB に接続する）ので、「テストは未実行」と明記して報告する。

## 2. 文書との突き合わせ

`docs/` の各文書と実装を、次の観点で読み比べる。根拠となる章番号を指摘に添える。

| 文書 | 確認する項目 |
| --- | --- |
| 機能要件書 3.1 | 優先度順の並べ替え規則：登録・優先度変更は **操作したカードを同じ優先度の末尾** に置く。FR-10（全リスト並べ替え）には「操作したカード」が無い。**移動・削除では並べ替えない**。同じ優先度の中の順序は保つ（安定ソート） |
| API 設計書 2. | ベースパス `/api`、camelCase、日付 `YYYY-MM-DD`、日時は UTC で末尾 `Z`（マイクロ秒まで）、値が無い項目は `null` で省略しない、区分値は DB の値のまま |
| API 設計書 2.1・2.2 | エラーは `ProblemDetail`（`title` / `status` / `detail` / `instance`）。入力チェックの 400 は `detail` に日本語を「、」で連結し `errors` を付ける。ステータスの使い分け（201 + `Location`、204 は sort と delete、body の `listId` 不在は 404 ではなく 400） |
| API 設計書 8.〜12. | 各 API の「処理」の手順どおりか。`title` は **前後の空白を除いてから** 1〜100 文字を判定、`priority` 省略時は `medium`、`description` の空白のみは `null`、移動の `displayOrder` は「自分を除いた並びの位置」で枚数以上なら末尾、削除後は `displayOrder` を詰める |
| フロントエンド設計書 2. 方針 7〜9 | 失敗文言の場所（取得はボード全体／登録・編集はその入力欄／移動・並べ替えはボード上部／削除はカード詳細のフッター）。**上部の文言は次の操作（移動・編集・登録・削除）が成功したときにも消す**。書き込み後は応答を差し込まず `GET` で取り直す。楽観更新は D&D だけ |
| フロントエンド設計書 4.2・8.5〜8.8 | コンポーネントの責務と props、追加フォーム・カード詳細・D&D・ツールバーの挙動表（保存の契機、Escape・背景クリックで閉じる、`maxLength`、フォーカスの位置） |
| 画面要件書 3.・5. | 3 列が横スクロール無しで見える、ツールバーはリストの枠の外、追加フォームは列の最下部、カード表面はタイトル・優先度・期限のみ、削除ボタンはカード詳細の下部 |
| データ設計書 2.・6. | 空文字は保存せず `NULL`、`display_order` は 0 からの連番で毎回振り直す、振り直しは 1 トランザクション、Flyway の適用済みファイルは編集しない |
| 技術スタック 3.〜4. | **書かれているライブラリが実際に `build.gradle` / `package.json` に入っているか**（選定済みなのに未導入、またはその逆）。バージョンの記述が実物と合っているか |
| 要件定義書 10.・11. | 決定事項（削除の確認ダイアログ無し、リスト固定、優先度 3 段階）と受け入れ基準の各行を実装で満たせるか |

文書どうしが矛盾しているとき（例：上位文書は「取得する」、下位文書の決定事項は「呼ばない」）は、**決定事項として明記されている方を正** とし、もう一方の文書を直す。文書を直したら版数・最終更新日・変更履歴の 3 つを更新する（CLAUDE.md 5.）。

## 3. バックエンドのチェックリスト（Spring Boot の標準）

- Controller は HTTP の変換だけ。業務処理とトランザクションは Service、SQL は Repository の派生クエリ（`findByListIdOrderByDisplayOrderAsc` など）
- Service はクラスに `@Transactional(readOnly = true)`、書き込みメソッドだけ `@Transactional` で上書き
- 要求・応答は `record`。エンティティを直接返さない。エンティティは setter を公開せず、操作の意味を表すメソッド（`update` / `moveTo` / `assignDisplayOrder`）で変える
- Bean Validation は要求 record に付け、DB の制約（`CHECK` / `NOT NULL`）と二重にかける。正規化（strip、空白 → `null`）は検証の **前** に済ませる
- エラー応答は `ProblemDetail` に統一。`spring.mvc.problemdetails.enabled=true` を前提にする
- `application.properties`：`spring.jpa.hibernate.ddl-auto=none`、`spring.jpa.open-in-view=false`、`server.port` は書かない。`show-sql=true` は開発専用（本番では無効にする）
- Flyway：適用済みの `V*.sql` は編集しない。定義変更は次の連番で追加
- 依存を増やすときは技術スタック文書 3. に行を追加する。「必要になるまで追加しない」（技術スタック 2.）
- テストは `@SpringBootTest` + `MockMvcTester` で API 単位。クラスに `@Transactional` を付けてロールバックさせ、DB にデータを残さない。件数そのものは検証しない
- 標準から外れていても **理由がコメントに書かれていれば** 許容する（例：`GlobalExceptionHandler` の `@Order(HIGHEST_PRECEDENCE)`、Actuator ではなく自作の `HealthController`）。理由が無ければ指摘する

## 4. フロントエンドのチェックリスト（React の標準）

- 関数コンポーネント + hooks。`React.FC` や class は使わない。`main.tsx` は `createRoot` + `StrictMode`
- `useEffect` は依存配列を正しく書き（`exhaustive-deps` 0 件）、非同期処理にはクリーンアップ（`cancelled` フラグ）を付ける
- 一覧の `key` は `id`。`CardDetail` は `key={card.id}` で作り直す
- 状態は最小限：一覧（`lists` / `cards`）は `useBoard` だけが持ち、入力の下書きは入力側のコンポーネント（`AddCardForm` / `CardDetail`）が持つ。状態管理ライブラリは入れない
- API 呼び出しは `src/api/` の薄い関数（`getCards` / `createCard` …）経由。コンポーネントやフックから `fetch` を直接呼ばない。エラーは `ApiError` 1 種類
- `src/types/board.ts` は API 設計書 4. と 1 対 1。項目名・型・`null` 可否を変えない
- a11y：失敗文言は `role="alert"`、`<label htmlFor>` + `id`（文言をラベルの中に入れない）、モーダルは `role="dialog"` + `aria-modal` + `aria-labelledby`、ボタンは `<button type="button">`
- スタイルは CSS Modules。グローバルは `index.css`（`*` と `body`）だけ。色や寸法は画面モック（`mock/style.css`）と設計書 8. に合わせる
- テストは Testing Library の役割・名前（`getByRole`、`findByText`）で要素を取り、クラス名や内部状態を見ない。`fetch` は `vi.stubGlobal` で差し替える
- 設定：`.oxlintrc.json` は `react/rules-of-hooks` と `react/exhaustive-deps` を `error`、`npm run lint` は `--deny-warnings`。Vitest の `passWithNoTests` は付けない

## 5. 横断のチェック

- **改行コード**：ルートの `.gitattributes`（`* text=auto eol=lf`）と `.editorconfig` により LF。`git ls-files --eol | grep 'w/crlf'` が `*.bat` 以外を返したら、`sed -i 's/\r$//'` で直すか作業ツリーを取り直す
- README のコマンドは Git Bash 構文（`./gradlew`、スラッシュ区切り）。PowerShell 構文が残っていたら直す（CLAUDE.md 3.）
- 文書を変えたら版数・最終更新日・変更履歴（CLAUDE.md 5.）。依存や設定を足したら技術スタック文書と README も更新
- 新しい npm スクリプトや Gradle タスクを足したら、`frontend/README.md` / `backend/README.md` / ルート `README.md` の表に追記

## 6. 報告の形式

結果は次の 3 区分に分けて報告する。各項目に根拠（文書の章番号、または標準の名前）を添える。

1. **文書と実装の食い違い**（文書を正として直すもの）
2. **標準からのずれ**（直すもの／直さないもの。**直さない判断にも理由を書く**）
3. **確認して問題なしと判断したもの**（何を見て問題なしとしたかを 1 行で）

修正は CLAUDE.md 2. の開発フロー（Issue → ブランチ → PR）に従い、PR のマージはユーザーの承認を得てから行う。
