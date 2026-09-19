# タスク管理アプリ API 設計書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ API 設計書 |
| 版数 | 1.1 |
| 作成日 | 2026-09-20 |
| 最終更新日 | 2026-09-20 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 上位文書 | [データ設計書](data-design.md) |
| 関連文書 | [要件定義書](requirements.md)、[機能要件書](functional-requirements.md)、[画面要件書](screen-requirements.md)、[データ要件書](data-requirements.md)、[技術スタック](tech-stack.md) |

本書は、[データ設計書](data-design.md) 12. が「API 実装の着手時に定める」として保留した **REST API の一覧と、要求・応答の JSON 形式** を定義する。フロントエンド（React）とバックエンド（Spring Boot）の間の取り決めであり、両者はこの文書に従って実装する。

本版（1.0）ではカードとリストの **取得（READ）** のみを定義する。登録・更新・削除は、それぞれの実装に着手するときに本書へ追記する（9. 保留事項）。

### 1.1 変更履歴

| 版数 | 日付 | 変更内容 | 変更者 |
| --- | --- | --- | --- |
| 1.0 | 2026-09-20 | 初版作成。共通方針と、カード・リストの取得 API（3 本）を定義 | KeiT0773 |
| 1.1 | 2026-09-20 | 取得 API の実装結果を反映。日時は UTC（末尾 `Z`）で返すことを明記し、応答例を修正。エラー応答の `type` が省略されること、Spring が生成する `detail` は英語になることを補記 | KeiT0773 |

---

## 2. 共通方針

本書のすべての API に共通して適用する事項。

| No | 事項 | 決定 | 理由 |
| --- | --- | --- | --- |
| 1 | ベースパス | すべての API は `/api` で始まる（例：`/api/cards`） | 将来フロントエンドを同じサーバーから配信する場合に、画面の URL と API の URL を区別できる。既存の動作確認 API（`/api/health`）と同じ |
| 2 | データ形式 | 要求・応答ともに JSON（`Content-Type: application/json`） | React の `fetch` と Spring Web の標準的な組み合わせ |
| 3 | 項目名 | camelCase（例：`listId`、`dueDate`、`displayOrder`） | JavaScript / TypeScript の慣習に合わせる。DB の snake_case（`list_id`）との変換はバックエンドが行う |
| 4 | 日付 | `YYYY-MM-DD` の文字列（例：`"2026-09-22"`） | ISO 8601 の日付形式。`due_date`（`date` 型）に対応。時刻は持たない |
| 5 | 日時 | ISO 8601 の UTC 表記（末尾 `Z`。例：`"2026-09-20T01:00:00.123456Z"`） | `created_at` / `updated_at`（`timestamptz` 型）に対応。DB の保存値（UTC）をそのまま返し、日本時間への変換は画面に表示するときにフロントエンドが行う（データ設計書 5.4）。秒の小数部は DB の精度（マイクロ秒）まで含む |
| 6 | 値が無い項目 | JSON の `null` で返す。項目自体を省略しない | データ設計書 2. 方針 4（未入力は `NULL`）に対応。項目が常に存在する方がフロントエンドの型定義が単純になる |
| 7 | 区分値 | 優先度は `high` / `medium` / `low`、リストは `todo` / `doing` / `done` を DB の値のまま返す | 表示名（高 / 中 / 低、未着手 / 作業中 / 完了）への変換はフロントエンドが行う（データ設計書 9.）。画面モック `mock/script.js` と同じ値 |
| 8 | 識別子 | カードの `id` は数値、リストの `id` は文字列 | データ設計書 4.1・4.2 の型に対応 |
| 9 | 認証 | 行わない | 利用者 1 名・ローカル環境が前提（[要件定義書](requirements.md) 5.1）。サーバー配置時に再検討する |

### 2.1 エラー応答の形式

処理に失敗したときは、Spring Framework が標準で提供する **`ProblemDetail`**（[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem Details for HTTP APIs）の形式で返す。

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "カードが見つかりません: id=999",
  "instance": "/api/cards/999"
}
```

| 項目 | 内容 |
| --- | --- |
| `type` | エラー種別を表す URI。本バージョンでは種別を細分化せず、既定値 `about:blank` のまま省略される（省略時は `about:blank` とみなす） |
| `title` | HTTP ステータスの標準的な名称 |
| `status` | HTTP ステータスコード（数値） |
| `detail` | 人が読むための説明。アプリが自分で投げる例外（404 など）は日本語。Spring が生成するもの（型不一致の 400 など）は英語のまま（例：`Failed to convert 'id' with value: 'abc'`） |
| `instance` | エラーが発生した要求のパス |

応答の `Content-Type` は `application/problem+json` になる。

独自のエラー形式を定義しないのは、標準の形式を使えば `@RestControllerAdvice` で例外を `ProblemDetail` に変換するだけで済み、応答の組み立てコードを自前で持たなくてよいためである（[技術スタック](tech-stack.md) 2. 構成を単純に保つ方針）。

### 2.2 使用する HTTP ステータス

| コード | 意味 | 本書での用途 |
| --- | --- | --- |
| 200 OK | 成功 | 取得に成功した |
| 400 Bad Request | 要求が不正 | パスやクエリの値が期待する型でない（例：`/api/cards/abc`） |
| 404 Not Found | 対象が存在しない | 指定した `id` のカードが無い |
| 500 Internal Server Error | サーバー内部の失敗 | DB に接続できないなど。フロントエンドは「保存されていない」旨を通知する（FR-09） |

---

## 3. エンドポイント一覧

| No | メソッド | パス | 内容 | 関連 |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/lists` | リスト一覧を取得する | SC-01 |
| 2 | GET | `/api/cards` | カード一覧を取得する。`listId` で絞り込める | FR-09、SC-01 |
| 3 | GET | `/api/cards/{id}` | カードを 1 件取得する | SC-02 |

登録・更新・削除（FR-01〜FR-08）は 9. 保留事項のとおり、実装時に追記する。

---

## 4. リソースの形式

### 4.1 リスト

| 項目 | 型 | NULL | 内容 | 対応するカラム |
| --- | --- | --- | --- | --- |
| `id` | string | 不可 | `todo` / `doing` / `done` | `lists.id` |
| `name` | string | 不可 | 画面に表示する列の名称 | `lists.name` |
| `displayOrder` | number | 不可 | ボード上での並び順。左から 0, 1, 2 | `lists.display_order` |

```json
{ "id": "todo", "name": "未着手", "displayOrder": 0 }
```

> Java のクラス名は `List` だと `java.util.List` と紛らわしいため（データ設計書 12.）、`BoardList` とする。API のパス（`/api/lists`）と JSON の形には影響しない。

### 4.2 カード

| 項目 | 型 | NULL | 内容 | 対応するカラム |
| --- | --- | --- | --- | --- |
| `id` | number | 不可 | カードの識別子。DB が採番 | `cards.id` |
| `title` | string | 不可 | タスク名 | `cards.title` |
| `description` | string | 可 | 補足説明。未入力は `null` | `cards.description` |
| `dueDate` | string（日付） | 可 | 期限。未設定は `null` | `cards.due_date` |
| `priority` | string | 不可 | `high` / `medium` / `low` | `cards.priority` |
| `listId` | string | 不可 | 所属リスト。`todo` / `doing` / `done` | `cards.list_id` |
| `displayOrder` | number | 不可 | リスト内での表示順。0 始まり | `cards.display_order` |
| `createdAt` | string（日時） | 不可 | 作成日時 | `cards.created_at` |
| `updatedAt` | string（日時） | 不可 | 更新日時 | `cards.updated_at` |

```json
{
  "id": 1,
  "title": "資料作成",
  "description": "来週の定例会議で使う資料。\n前回の議事録を参照すること。",
  "dueDate": "2026-09-22",
  "priority": "high",
  "listId": "todo",
  "displayOrder": 0,
  "createdAt": "2026-09-20T01:00:00.123456Z",
  "updatedAt": "2026-09-20T01:00:00.123456Z"
}
```

期限超過かどうかはフロントエンドが判定する（データ設計書 5.4）ため、API は判定結果を返さない。

---

## 5. GET `/api/lists` — リスト一覧の取得

ボード画面（SC-01）の 3 つの列を描画するために、リストを並び順で返す。

### 要求

パラメータなし。

### 応答

| ステータス | 本文 |
| --- | --- |
| 200 | 4.1 の形式の配列。`displayOrder` の昇順 |

```json
[
  { "id": "todo",  "name": "未着手", "displayOrder": 0 },
  { "id": "doing", "name": "作業中", "displayOrder": 1 },
  { "id": "done",  "name": "完了",   "displayOrder": 2 }
]
```

リストは 3 件で固定（[要件定義書](requirements.md) 決定事項 No.1）のため、フロントエンドに定数として持たせる選択もある。それでも API を用意するのは、表示名を DB 側で一元管理し、フロントエンドが DB と食い違う値を持たないようにするためである。

---

## 6. GET `/api/cards` — カード一覧の取得

アプリを開いたときにボード画面（SC-01）が全カードを取得する（[データ要件書](data-requirements.md) 5. の D5「全カードの取得」）。

### 要求

| 種別 | 名前 | 型 | 必須 | 内容 |
| --- | --- | --- | --- | --- |
| クエリ | `listId` | string | 任意 | 指定したリストのカードだけを返す。省略時は全件 |

```
GET /api/cards
GET /api/cards?listId=todo
```

### 応答

| ステータス | 本文 |
| --- | --- |
| 200 | 4.2 の形式の配列。`listId`、`displayOrder` の昇順（データ設計書 6.「取得時の並び」） |

```json
[
  { "id": 1, "title": "資料作成", "description": "来週の定例会議で使う資料。", "dueDate": "2026-09-22", "priority": "high",   "listId": "todo",  "displayOrder": 0, "createdAt": "2026-09-20T01:00:00.123456Z", "updatedAt": "2026-09-20T01:00:00.123456Z" },
  { "id": 2, "title": "買い物",   "description": "牛乳、卵、パン",           "dueDate": "2026-09-17", "priority": "medium", "listId": "todo",  "displayOrder": 1, "createdAt": "2026-09-20T01:00:00.123456Z", "updatedAt": "2026-09-20T01:00:00.123456Z" },
  { "id": 4, "title": "実装",     "description": null,                        "dueDate": null,         "priority": "medium", "listId": "doing", "displayOrder": 0, "createdAt": "2026-09-20T01:00:00.123456Z", "updatedAt": "2026-09-20T01:00:00.123456Z" }
]
```

- カードが 1 件も無い場合は空の配列 `[]` を返す（404 にはしない）。
- `listId` に存在しないリスト（例：`?listId=xxx`）を指定した場合も、エラーにせず空の配列を返す。絞り込み条件に合う行が無いだけであり、要求自体は正しいため。

### ボード全体を 1 回で返す API を用意しない理由

「リスト 3 件と、それぞれに属するカード」を入れ子の JSON で返す `/api/board` のような API も考えられるが、本版では採用しない。`/api/lists` と `/api/cards` の 2 回の要求で同じ情報が得られ、応答の形が平らな方が TypeScript の型定義と React の状態管理が単純になる。カードは最大 100 件程度（[要件定義書](requirements.md) 5.1）であり、2 回に分けても性能上の問題はない。

---

## 7. GET `/api/cards/{id}` — カード 1 件の取得

カード詳細（SC-02）を開くときに、そのカードの最新の内容を取得する。

### 要求

| 種別 | 名前 | 型 | 必須 | 内容 |
| --- | --- | --- | --- | --- |
| パス | `id` | number | 必須 | カードの識別子 |

```
GET /api/cards/1
```

### 応答

| ステータス | 本文 |
| --- | --- |
| 200 | 4.2 の形式のオブジェクト 1 件 |
| 400 | `id` が数値でない（例：`/api/cards/abc`）。2.1 の形式 |
| 404 | 指定した `id` のカードが存在しない。2.1 の形式 |

```json
{
  "id": 1,
  "title": "資料作成",
  "description": "来週の定例会議で使う資料。\n前回の議事録を参照すること。",
  "dueDate": "2026-09-22",
  "priority": "high",
  "listId": "todo",
  "displayOrder": 0,
  "createdAt": "2026-09-20T01:00:00.123456Z",
  "updatedAt": "2026-09-20T01:00:00.123456Z"
}
```

---

## 8. 設計上の決定事項

| No | 決定内容 | 関連 | 決定日 |
| --- | --- | --- | --- |
| 1 | ベースパスは `/api`、項目名は camelCase とする | 2. | 2026-09-20 |
| 2 | 日付は `YYYY-MM-DD`、日時は ISO 8601 オフセット付きの文字列で表す | 2. | 2026-09-20 |
| 3 | 値が無い項目は省略せず `null` を返す | 2. | 2026-09-20 |
| 4 | 優先度・リストの区分値は DB の値をそのまま返し、表示名への変換はフロントエンドが行う | 2. | 2026-09-20 |
| 5 | エラー応答は RFC 9457 `ProblemDetail` の形式とし、独自形式は定義しない | 2.1 | 2026-09-20 |
| 6 | ボード全体を入れ子で返す API は用意せず、`/api/lists` と `/api/cards` の 2 本で取得する | 6. | 2026-09-20 |
| 7 | 一覧の取得で該当が 0 件のときは空配列を返し、404 にしない | 6. | 2026-09-20 |

---

## 9. 保留事項

| 事項 | 保留理由 | 決定時期 |
| --- | --- | --- |
| カードの登録・更新・削除・移動・並べ替えの API（FR-01〜FR-08） | 取得 API を先に完成させ、フロントエンドとの通信を確認してから着手する | 各機能の実装着手時に本書へ追記 |
| 入力チェックのエラー（400）の `detail` に、項目ごとの誤りをどう含めるか | 登録・更新 API が無い段階では決められない | 登録 API の実装時 |
| API 仕様書ツール（springdoc-openapi / Swagger UI）の導入 | [技術スタック](tech-stack.md) 3. で選定済みだが未導入。本書と自動生成された仕様のどちらを正とするかを決める必要がある | 登録 API の実装時 |
| 認証・認可 | 利用者 1 名・ローカル環境のため不要 | サーバー配置時 |
