# タスク管理アプリ フロントエンド設計書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ フロントエンド設計書 |
| 版数 | 1.0 |
| 作成日 | 2026-09-20 |
| 最終更新日 | 2026-09-20 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 上位文書 | [画面要件書](screen-requirements.md) |
| 関連文書 | [要件定義書](requirements.md)、[機能要件書](functional-requirements.md)、[データ設計書](data-design.md)、[API 設計書](api-design.md)、[技術スタック](tech-stack.md) |

本書は、[画面要件書](screen-requirements.md) で定義した画面を React でどう組み立てるかを定義する。具体的には、**画面をどのコンポーネントに分けるか、取得したデータをどこで保持するか、バックエンドの API をどう呼ぶか、区分値や日付をどう表示するか、開発サーバーからバックエンドへどう接続するか** を決める。

本版（1.0）では **ボード画面（SC-01）に、バックエンドから取得したリストとカードを表示する** ところまでを対象とする。カードの登録・編集・削除・移動（FR-01〜FR-08）とカード詳細（SC-02）は、対応する API が [API 設計書](api-design.md) に追記された時点で本書にも追記する（11. 保留事項）。

本書が扱う範囲と、扱わない範囲は次のとおり。

| 範囲 | 扱い | 定義する文書 |
| --- | --- | --- |
| コンポーネント構成、状態の持ち方、API 呼び出し、表示ルール、開発サーバーの設定 | 本書で定義する | 本書 |
| 画面の構成要素と遷移（何を表示するか） | 本書では扱わない | [画面要件書](screen-requirements.md) |
| API の一覧と JSON の形式 | 本書では扱わない | [API 設計書](api-design.md) |
| 使用するライブラリの選定と理由 | 本書では扱わない | [技術スタック](tech-stack.md) |

### 1.1 変更履歴

| 版数 | 日付 | 変更内容 | 変更者 |
| --- | --- | --- | --- |
| 1.0 | 2026-09-20 | 初版作成。ボード画面（SC-01）の表示に必要なコンポーネント構成・状態・API 呼び出し・表示ルールを定義 | KeiT0773 |

---

## 2. 設計方針

| No | 事項 | 決定 | 理由 |
| --- | --- | --- | --- |
| 1 | バックエンドとの接続 | 開発時は Vite の開発サーバーが持つ **プロキシ機能** で `/api` 以下の要求をバックエンド（`http://localhost:8080`）へ転送する。フロントエンドのコードは `fetch('/api/cards')` のように **相対パス** で呼ぶ | バックエンドに CORS（別オリジンからのアクセス許可）の設定を追加せずに済む。[API 設計書](api-design.md) 2. 方針 1「将来フロントエンドを同じサーバーから配信する」と整合し、配置形態が変わってもフロントエンドのコードを変更しなくてよい |
| 2 | 状態管理 | 状態管理ライブラリは導入しない。取得したリストとカードは、ボードを描画するコンポーネントの直下にあるカスタムフック `useBoard` が React 標準の `useState` / `useEffect` で保持する | 画面は 1 つ、データは最大 100 件程度（[要件定義書](requirements.md) 5.1）。[技術スタック](tech-stack.md) 2.「必要になるまでライブラリを追加しない」 |
| 3 | スタイル | CSS Modules を使い、画面モック `mock/style.css` をコンポーネントごとの `*.module.css` に分割して移植する。全体に効かせる指定（`*` と `body`）だけをグローバルの `index.css` に置く | モックで確認済みの見た目をそのまま再現できる。クラス名がコンポーネントごとに閉じるため、名前の衝突を気にしなくてよい |
| 4 | 区分値の表示名 | `priority`（`high` / `medium` / `low`）を「高 / 中 / 低」に変換するのはフロントエンドの責務とする。リストの表示名（未着手 / 作業中 / 完了）は API の `name` をそのまま使う | [API 設計書](api-design.md) 2. 方針 7 |
| 5 | 期限超過の判定 | フロントエンドが表示のたびに判定する | [データ設計書](data-design.md) 5.4。API は判定結果を返さない |
| 6 | 今回置かない要素 | 「＋ カードを追加」ボタン、ドラッグ&ドロップ、カードのクリックによる詳細表示は本版では実装しない | 対応する API が無く、押しても動かない要素を置くより、機能の実装時に追加する方が混乱がない |
| 7 | 通信エラーの通知 | サーバーに接続できない、または API がエラーを返したときは、ボードの代わりにその旨の文言を表示する | FR-09「保存されていないことを利用者に分かるように通知する」の第一歩。本版は取得のみのため「表示できない」ことを伝える |

---

## 3. ディレクトリ構成

`frontend/` の中の、`src/` 配下の構成を次のとおり定める。役割ごとにディレクトリを分け、コンポーネントは 1 つにつき 1 ディレクトリ（`.tsx` と `.module.css` を同じ場所に置く）とする。

```
frontend/
├── index.html                  Vite のエントリ HTML
├── vite.config.ts              開発サーバー（プロキシ）とテストの設定
├── package.json
└── src/
    ├── main.tsx                React の起動（App を DOM に描画）
    ├── App.tsx                 画面全体（AppHeader + Board）
    ├── index.css               グローバルスタイル（* と body のみ）
    ├── types/
    │   └── board.ts            API の応答に対応する型（Priority, ListId, BoardList, Card）
    ├── api/
    │   ├── client.ts           fetch の共通処理（apiGet, ApiError）
    │   ├── lists.ts            GET /api/lists
    │   └── cards.ts            GET /api/cards
    ├── hooks/
    │   └── useBoard.ts         リストとカードの取得と、読み込み状態の保持
    ├── utils/
    │   └── date.ts             日付の書式変換と期限超過の判定
    ├── constants/
    │   └── priority.ts         優先度の表示名
    ├── components/
    │   ├── AppHeader/          ヘッダー
    │   ├── Board/              ボード（3 列の親。読み込み中・エラーの表示もここ）
    │   ├── BoardList/          1 つのリスト（列）
    │   ├── Card/               1 枚のカード
    │   └── PriorityBadge/      優先度の色付きバッジ
    └── test/
        └── setup.ts            テストの共通設定
```

`components/` 以下の各ディレクトリには `<名前>.tsx`、`<名前>.module.css`、必要に応じて `<名前>.test.tsx` を置く。

---

## 4. コンポーネント構成

### 4.1 ツリー

```
App
├── AppHeader
└── Board                       ← useBoard() でデータを取得
    ├── BoardList（未着手）
    │   ├── Card
    │   │   └── PriorityBadge
    │   └── Card ...
    ├── BoardList（作業中）
    └── BoardList（完了）
```

### 4.2 各コンポーネントの責務と props

| コンポーネント | 責務 | props | 対応する要件 |
| --- | --- | --- | --- |
| `App` | `AppHeader` と `Board` を縦に並べる。それ以外の処理は持たない | なし | — |
| `AppHeader` | 画面上部の青い帯にアプリ名「タスク管理ボード」を表示する | なし | SC-01 |
| `Board` | `useBoard` を呼び、状態に応じて「読み込み中」「エラー文言」「3 つの `BoardList`」のいずれかを描画する。各 `BoardList` には、そのリストに属するカードだけを渡す | なし | SC-01、画面構成 3.「3 つのリストを横に並べる」 |
| `BoardList` | リストの見出し（`name`）と件数（`n件`）、カードの一覧を縦に描画する。カードが多いときは列の中だけをスクロールさせる | `list: BoardList`、`cards: Card[]` | 画面構成 3.「カードを表示順に従って縦に並べる」 |
| `Card` | カード 1 枚。優先度バッジ、タイトル、期限の行を表示する。期限超過なら強調表示する | `card: Card` | 画面構成 3.「タイトル・優先度・期限が読み取れる」、FR-07、FR-08 |
| `PriorityBadge` | 優先度を表示名（高 / 中 / 低）と色で表示する | `priority: Priority` | FR-08「色付きの表示」 |

「＋ カードを追加」の領域（画面要件書 5.1）は、FR-01 の実装時に `BoardList` の下部へ追加する（2. 方針 6）。

---

## 5. 状態とデータの流れ

### 5.1 取得の流れ

アプリを開いたときに 1 回だけ、リストとカードを取得する（[データ要件書](data-requirements.md) 5. の D5「全カードの取得」）。

```
Board が描画される
  → useBoard の useEffect が起動
  → GET /api/lists と GET /api/cards を同時に要求（Promise.all）
  → 両方が返ったら state に保存し、Board が再描画される
  → Board は lists を順に BoardList にし、cards を listId で振り分けて渡す
```

`/api/lists` は `displayOrder` の昇順、`/api/cards` は `listId`・`displayOrder` の昇順で返る（[API 設計書](api-design.md) 5.・6.）ため、フロントエンドでは並べ替えを行わず、**`listId` による振り分けだけ** を行う。

### 5.2 `useBoard` が持つ状態

| 状態 | 型 | 初期値 | 意味 |
| --- | --- | --- | --- |
| `lists` | `BoardList[]` | `[]` | 取得したリスト |
| `cards` | `Card[]` | `[]` | 取得したカード |
| `loading` | `boolean` | `true` | 取得中かどうか |
| `error` | `ApiError \| null` | `null` | 取得に失敗した場合のエラー |

`Board` はこの 4 つを受け取り、次の順で表示を決める。

| 条件 | 表示 |
| --- | --- |
| `loading === true` | 「読み込み中…」 |
| `error !== null` | エラー文言（6.3 参照） |
| それ以外 | `lists` の数だけ `BoardList` を描画する |

`useEffect` のクリーンアップで「取り消し済み」フラグを立て、コンポーネントが消えた後に応答が返っても状態を更新しないようにする（React の開発モードでは `useEffect` が 2 回実行されるため、これが無いと二重更新の原因になる）。

---

## 6. API 呼び出しの方針

### 6.1 共通処理 `apiGet`

`src/api/client.ts` に、GET 要求の共通処理を 1 つ置く。個々の API（`lists.ts`、`cards.ts`）はこれを呼ぶだけの薄い関数とし、パスと戻り値の型だけを持つ。

```ts
export async function apiGet<T>(path: string): Promise<T>;
```

| 状況 | 動作 |
| --- | --- |
| `fetch` 自体が失敗した（サーバー停止、ネットワーク未接続など。`TypeError` が投げられる） | `ApiError(null, 'サーバーに接続できません')` を投げる |
| 応答が `2xx` 以外 | 本文を `ProblemDetail`（[API 設計書](api-design.md) 2.1）として読み、`ApiError(status, detail)` を投げる。本文が読めなければ `title` または HTTP ステータスの文言を使う |
| 応答が `2xx` | 本文の JSON を `T` として返す |

### 6.2 `ApiError`

```ts
export class ApiError extends Error {
  constructor(readonly status: number | null, message: string);
}
```

`status` が `null` のときは「サーバーに到達できなかった」、数値のときは「サーバーがその HTTP ステータスで応答した」ことを表す。呼び出し側はこの 1 種類だけを扱えばよい。

### 6.3 エラー時の表示文言

| `status` | 表示する文言 |
| --- | --- |
| `null` | サーバーに接続できません。バックエンドが起動しているか確認してください。 |
| `500` | サーバーでエラーが発生しました。 |
| その他 | `ApiError.message`（API が返した `detail`）をそのまま表示する |

---

## 7. 型定義

`src/types/board.ts` に、[API 設計書](api-design.md) 4. のリソース形式と 1 対 1 で対応する型を定義する。項目名・型・NULL 可否を API 設計書から変えてはならない。

| 型 | 定義 | 対応 |
| --- | --- | --- |
| `Priority` | `'high' \| 'medium' \| 'low'` | API 設計書 2. 方針 7 |
| `ListId` | `'todo' \| 'doing' \| 'done'` | API 設計書 2. 方針 7 |
| `BoardList` | `{ id: ListId; name: string; displayOrder: number }` | API 設計書 4.1 |
| `Card` | `{ id: number; title: string; description: string \| null; dueDate: string \| null; priority: Priority; listId: ListId; displayOrder: number; createdAt: string; updatedAt: string }` | API 設計書 4.2 |

`dueDate` は `YYYY-MM-DD` の文字列、`createdAt` / `updatedAt` は ISO 8601（UTC）の文字列のまま保持し、`Date` 型には変換しない（表示するときに必要な形へ変換する）。

---

## 8. 表示ルール

### 8.1 優先度

| `priority` | 表示名 | 色 |
| --- | --- | --- |
| `high` | 高 | `#de350b`（赤） |
| `medium` | 中 | `#ff991f`（橙） |
| `low` | 低 | `#36b37e`（緑） |

表示名は `src/constants/priority.ts` の `PRIORITY_LABEL` に定数として持つ。色は `PriorityBadge.module.css` に持つ。

### 8.2 期限

| `dueDate` | カードの期限行の表示 |
| --- | --- |
| `null` | 空欄。ただし行の高さは確保し、カードの高さが揃うようにする（画面モックと同じ） |
| 期限超過でない | `期限 MM/DD`（例：`期限 09/22`） |
| 期限超過 | `期限 MM/DD（期限切れ）` を赤字・太字で表示する |

### 8.3 期限超過の判定

[データ設計書](data-design.md) 5.4 の基準「日本時間での今日の日付が `due_date` より後」を、フロントエンドでは次のとおり実装する。

- 「今日」は端末のローカル日付とする。[要件定義書](requirements.md) 5.1 の想定端末は日本国内にあるため、日本時間と一致する。
- 比較は `YYYY-MM-DD` の文字列どうしの辞書順で行う（この形式は文字列の大小と日付の前後が一致する）。
- **「完了」リスト（`listId === 'done'`）のカードは、期限を過ぎていても期限超過として表示しない。** 終わったタスクに警告を出す意味がないため。画面モック `mock/script.js` の `isOverdue` と、[画面要件書](screen-requirements.md) 5.1 の画面イメージ（完了列の「返信」は過去の期限だが `(!)` が付いていない）に合わせる。

```
isOverdue(card) = card.dueDate !== null
               && card.dueDate < today()
               && card.listId !== 'done'
```

### 8.4 日時

`createdAt` / `updatedAt` は本版では画面に表示しない（[データ設計書](data-design.md) 5.4）。表示するときは日本時間に変換する。

---

## 9. 開発サーバーとバックエンドの接続

| 項目 | 内容 |
| --- | --- |
| フロントエンドの URL | `http://localhost:5173`（Vite の既定ポート） |
| バックエンドの URL | `http://localhost:8080` |
| プロキシ | `vite.config.ts` の `server.proxy` で、`/api` で始まる要求を `http://localhost:8080` へ転送する |
| 起動順 | ① `docker compose up -d`（DB）→ ② `./gradlew bootRun`（バックエンド）→ ③ `npm run dev`（フロントエンド） |

ブラウザから見ると、画面も API も同じ `http://localhost:5173` から提供されているように見える。このため CORS の設定は不要になる。

```
ブラウザ ──GET /api/cards──▶ Vite 開発サーバー (5173) ──転送──▶ Spring Boot (8080)
```

---

## 10. 設計上の決定事項

| No | 決定内容 | 関連 | 決定日 |
| --- | --- | --- | --- |
| 1 | 開発時のバックエンド接続は Vite のプロキシで行い、CORS 設定は追加しない | 2.、9. | 2026-09-20 |
| 2 | 状態管理ライブラリは導入せず、`useBoard` フックが `useState` / `useEffect` で保持する | 2.、5. | 2026-09-20 |
| 3 | スタイルは CSS Modules とし、画面モックの CSS をコンポーネントごとに分割して移植する | 2.、3. | 2026-09-20 |
| 4 | リストとカードは同時に取得し、フロントエンドでは並べ替えず `listId` で振り分けるだけとする | 5. | 2026-09-20 |
| 5 | API のエラーは `ApiError` 1 種類に正規化し、`status` の有無でサーバー到達可否を区別する | 6. | 2026-09-20 |
| 6 | 「完了」リストのカードは期限超過として表示しない | 8.3 | 2026-09-20 |
| 7 | 「＋ カードを追加」、ドラッグ&ドロップ、カード詳細は本版では置かない | 2. | 2026-09-20 |

---

## 11. 保留事項

| 事項 | 保留理由 | 決定時期 |
| --- | --- | --- |
| カード詳細（SC-02）のコンポーネント構成と開閉の状態管理 | 取得 API（`GET /api/cards/{id}`）はあるが、編集 API が無い段階では読み取り専用の詳細を作る意味が薄い | 編集 API（FR-02, FR-06〜FR-08）の追記時 |
| カード登録（FR-01）の入力欄と、登録後の優先度順並べ替えの実装 | 登録 API が無い | 登録 API の追記時 |
| ドラッグ&ドロップ（FR-04, FR-05）の実装と `@hello-pangea/dnd` の導入 | 移動・並べ替え API が無い | 移動 API の追記時 |
| 通信エラー時の再試行の仕組み（FR-09） | 本版は取得のみで、再読み込みすれば復旧する | 書き込み API の追記時 |
| テストの範囲（どのコンポーネントにテストを書くか） | まずは純粋な関数（日付の判定）と `Card` の表示に限定する。書き込みが入ると範囲を広げる必要がある | 書き込み API の追記時 |
