# タスク管理アプリ フロントエンド設計書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ フロントエンド設計書 |
| 版数 | 2.0 |
| 作成日 | 2026-09-20 |
| 最終更新日 | 2026-09-21 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 上位文書 | [画面要件書](screen-requirements.md) |
| 関連文書 | [要件定義書](requirements.md)、[機能要件書](functional-requirements.md)、[データ設計書](data-design.md)、[API 設計書](api-design.md)、[技術スタック](tech-stack.md) |

本書は、[画面要件書](screen-requirements.md) で定義した画面を React でどう組み立てるかを定義する。具体的には、**画面をどのコンポーネントに分けるか、取得したデータをどこで保持するか、バックエンドの API をどう呼ぶか、区分値や日付をどう表示するか、開発サーバーからバックエンドへどう接続するか** を決める。

1.0 では **ボード画面（SC-01）に、バックエンドから取得したリストとカードを表示する** ところまでを対象としていた。本版（2.0）では **各リストの「＋ カードを追加」からカードを登録する（FR-01）** を追加する。カードの編集・削除・移動（FR-02〜FR-08）とカード詳細（SC-02）は、対応する API が [API 設計書](api-design.md) に追記された時点で本書にも追記する（11. 保留事項）。

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
| 2.0 | 2026-09-21 | カード登録（FR-01）を追加。`AddCardForm` コンポーネント（4.）、`useBoard` の `addCard` と登録後の再取得の流れ（5.3）、`apiPost`（6.1）、`CardCreateInput`（7.）、追加フォームの挙動（8.5）を定義。方針 6・7 と決定事項・保留事項を更新 | KeiT0773 |

---

## 2. 設計方針

| No | 事項 | 決定 | 理由 |
| --- | --- | --- | --- |
| 1 | バックエンドとの接続 | 開発時は Vite の開発サーバーが持つ **プロキシ機能** で `/api` 以下の要求をバックエンド（`http://localhost:8080`）へ転送する。フロントエンドのコードは `fetch('/api/cards')` のように **相対パス** で呼ぶ | バックエンドに CORS（別オリジンからのアクセス許可）の設定を追加せずに済む。[API 設計書](api-design.md) 2. 方針 1「将来フロントエンドを同じサーバーから配信する」と整合し、配置形態が変わってもフロントエンドのコードを変更しなくてよい |
| 2 | 状態管理 | 状態管理ライブラリは導入しない。取得したリストとカードは、ボードを描画するコンポーネントの直下にあるカスタムフック `useBoard` が React 標準の `useState` / `useEffect` で保持する | 画面は 1 つ、データは最大 100 件程度（[要件定義書](requirements.md) 5.1）。[技術スタック](tech-stack.md) 2.「必要になるまでライブラリを追加しない」 |
| 3 | スタイル | CSS Modules を使い、画面モック `mock/style.css` をコンポーネントごとの `*.module.css` に分割して移植する。全体に効かせる指定（`*` と `body`）だけをグローバルの `index.css` に置く | モックで確認済みの見た目をそのまま再現できる。クラス名がコンポーネントごとに閉じるため、名前の衝突を気にしなくてよい |
| 4 | 区分値の表示名 | `priority`（`high` / `medium` / `low`）を「高 / 中 / 低」に変換するのはフロントエンドの責務とする。リストの表示名（未着手 / 作業中 / 完了）は API の `name` をそのまま使う | [API 設計書](api-design.md) 2. 方針 7 |
| 5 | 期限超過の判定 | フロントエンドが表示のたびに判定する | [データ設計書](data-design.md) 5.4。API は判定結果を返さない |
| 6 | 今回置かない要素 | ドラッグ&ドロップ、カードのクリックによる詳細表示は本版では実装しない。「＋ カードを追加」は登録 API が揃ったため 2.0 で追加する | 対応する API が無く、押しても動かない要素を置くより、機能の実装時に追加する方が混乱がない |
| 7 | 通信エラーの通知 | **取得**に失敗したときは、ボードの代わりにその旨の文言を表示する。**登録**に失敗したときは、入力欄の下に文言を表示し、入力した内容は消さずに残す | FR-09「保存されていないことを利用者に分かるように通知する」。取得の失敗は画面全体が成り立たないのでボードごと差し替えるが、登録の失敗は「その 1 件が保存されていない」ことなので、ボードは表示したまま該当の入力欄で伝える。入力を残すのは、利用者がもう一度打ち直さずに再送できるようにするため |
| 8 | 登録後の画面反映 | 登録に成功したら、応答のカード 1 件を手元の一覧に差し込むのではなく、`GET /api/cards?listId=` でそのリストを取り直して置き換える | 登録後はサーバーがリスト内を優先度順に並べ直し、他のカードの `displayOrder` も変わりうる（[API 設計書](api-design.md) 8.「登録後に画面へ反映する方法」）。取り直せば並べ替えの規則をフロントエンドに持たなくて済み、方針「フロントエンドでは並べ替えない」（5.1）を保てる |

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
    │   └── board.ts            API の要求・応答に対応する型（Priority, ListId, BoardList, Card, CardCreateInput）
    ├── api/
    │   ├── client.ts           fetch の共通処理（apiGet, apiPost, ApiError）
    │   ├── lists.ts            GET /api/lists
    │   └── cards.ts            GET /api/cards、POST /api/cards
    ├── hooks/
    │   └── useBoard.ts         リストとカードの取得・保持と、カードの登録
    ├── utils/
    │   ├── date.ts             日付の書式変換と期限超過の判定
    │   └── errorMessage.ts     ApiError から表示文言への変換（6.3）
    ├── constants/
    │   └── priority.ts         優先度の表示名と並び順
    ├── components/
    │   ├── AppHeader/          ヘッダー
    │   ├── Board/              ボード（3 列の親。読み込み中・エラーの表示もここ）
    │   ├── BoardList/          1 つのリスト（列）
    │   ├── Card/               1 枚のカード
    │   ├── AddCardForm/        「＋ カードを追加」ボタンと入力フォーム
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
└── Board                       ← useBoard() でデータを取得・登録
    ├── BoardList（未着手）
    │   ├── Card
    │   │   └── PriorityBadge
    │   ├── Card ...
    │   └── AddCardForm         ← 列の最下部。閉じているときはボタン、開くと入力欄
    │       └── PriorityBadge   （優先度の選択肢のラベル）
    ├── BoardList（作業中）
    └── BoardList（完了）
```

### 4.2 各コンポーネントの責務と props

| コンポーネント | 責務 | props | 対応する要件 |
| --- | --- | --- | --- |
| `App` | `AppHeader` と `Board` を縦に並べる。それ以外の処理は持たない | なし | — |
| `AppHeader` | 画面上部の青い帯にアプリ名「タスク管理ボード」を表示する | なし | SC-01 |
| `Board` | `useBoard` を呼び、状態に応じて「読み込み中」「エラー文言」「3 つの `BoardList`」のいずれかを描画する。各 `BoardList` には、そのリストに属するカードと、登録用の関数 `addCard` を渡す | なし | SC-01、画面構成 3.「3 つのリストを横に並べる」 |
| `BoardList` | リストの見出し（`name`）と件数（`n件`）、カードの一覧、最下部に `AddCardForm` を縦に描画する。カードが多いときは列の中だけをスクロールさせる（`AddCardForm` はスクロール領域の外に置き、常に見える） | `list: BoardList`、`cards: Card[]`、`onAddCard: (input: CardCreateInput) => Promise<void>` | 画面構成 3.「カードを表示順に従って縦に並べる」、画面要件書 5.1 |
| `Card` | カード 1 枚。優先度バッジ、タイトル、期限の行を表示する。期限超過なら強調表示する | `card: Card` | 画面構成 3.「タイトル・優先度・期限が読み取れる」、FR-07、FR-08 |
| `AddCardForm` | 閉じているときは「＋ カードを追加」ボタンを表示する。押すと、その場にタイトルの入力欄・優先度の選択（高 / 中 / 低）・「追加」「キャンセル」ボタンを表示する。入力内容・開閉・送信中・失敗の状態を自分で持ち、送信は `onSubmit` に委ねる（8.5） | `listId: ListId`、`onSubmit: (input: CardCreateInput) => Promise<void>` | FR-01、画面要件書 5.1「カード追加の入力欄」 |
| `PriorityBadge` | 優先度を表示名（高 / 中 / 低）と色で表示する | `priority: Priority` | FR-08「色付きの表示」 |

`AddCardForm` が API を直接呼ばず `onSubmit` を受け取るのは、**カードの一覧（`cards`）を持っているのが `useBoard` だけ** だからである。登録後の一覧の更新は `useBoard` の `addCard`（5.3）が行い、`AddCardForm` は「送信して、成功か失敗かを知る」ことだけに責任を持つ。この分け方にしておくと、`AddCardForm` のテストは `onSubmit` に渡した関数の呼ばれ方を見るだけで済む。

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

### 5.3 登録の流れ

`useBoard` は 5.2 の状態に加えて、カードを登録する関数を返す。

```ts
addCard(input: CardCreateInput): Promise<void>
```

```
AddCardForm で「追加」を押す
  → onSubmit（= useBoard の addCard）を呼ぶ
  → POST /api/cards に { title, priority, listId } を送る
  → 成功（201）したら GET /api/cards?listId=<そのリスト> でリストのカードを取り直す
  → cards のうち、そのリストに属していたカードを取り直した配列で置き換える（他のリストはそのまま）
  → Board が再描画され、新しいカードが優先度順の位置に表示される
  → AddCardForm は入力欄を空にして開いたままにする（続けて追加できる）
```

| 状況 | `addCard` の動作 | 画面 |
| --- | --- | --- |
| POST と GET の両方が成功 | `cards` を更新して正常終了する | 新しいカードが表示され、件数が増える |
| POST が失敗（400、500、接続不可） | `ApiError` をそのまま投げる。`cards` は変更しない | `AddCardForm` が入力欄の下に文言（6.3）を出し、入力内容は残す |
| POST は成功したが GET が失敗 | `ApiError` を投げる。`cards` は変更しない | 同上。カード自体は保存されているので、画面を再読み込みすれば表示される |

登録の失敗は **`useBoard` の `error` には入れない**。`error` は「ボードを表示できない」状態を表すもの（5.2）であり、登録に失敗してもボードは表示し続けるべきだからである（2. 方針 7）。失敗の状態は `AddCardForm` が自分で持つ（8.5）。

`cards` の置き換えは、`setCards(prev => [...prev.filter(c => c.listId !== listId), ...fetched])` のように **直前の状態を引数に取る形** で行う。`addCard` を作った時点の `cards` を参照すると、その後に他の操作で変わった内容を上書きしてしまうため。

---

## 6. API 呼び出しの方針

### 6.1 共通処理 `apiGet` / `apiPost`

`src/api/client.ts` に、GET と POST の共通処理を置く。個々の API（`lists.ts`、`cards.ts`）はこれを呼ぶだけの薄い関数とし、パスと要求・戻り値の型だけを持つ。

```ts
export async function apiGet<T>(path: string): Promise<T>;
export async function apiPost<TBody, T>(path: string, body: TBody): Promise<T>;
```

`apiPost` は `Content-Type: application/json` を付け、`body` を `JSON.stringify` して送る。2 つの関数は内部の共通処理（`fetch` の実行と応答の判定）を共有し、違いは HTTP メソッドと body の有無だけとする。

| 状況 | 動作 |
| --- | --- |
| `fetch` 自体が失敗した（サーバー停止、ネットワーク未接続など。`TypeError` が投げられる） | `ApiError(null, 'サーバーに接続できません')` を投げる |
| 応答が `2xx` 以外 | 本文を `ProblemDetail`（[API 設計書](api-design.md) 2.1）として読み、`ApiError(status, detail)` を投げる。本文が読めなければ `title` または HTTP ステータスの文言を使う。入力チェックのエラー（400）は `detail` に項目ごとのメッセージが連結されているので、`errors` は読まない |
| 応答が `2xx`（`200` も `201` も） | 本文の JSON を `T` として返す |

`cards.ts` の関数は次の 2 つになる。

```ts
export function getCards(listId?: ListId): Promise<Card[]>;          // GET /api/cards[?listId=]
export function createCard(input: CardCreateInput): Promise<Card>;   // POST /api/cards
```

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
| その他 | `ApiError.message`（API が返した `detail`）をそのまま表示する。登録の 400 なら「タイトルは必須です」のような日本語の文言になる |

この変換は `src/utils/errorMessage.ts` の `errorMessage(error: ApiError): string` に置き、ボード全体のエラー表示（`Board`）と登録失敗の表示（`AddCardForm`）の両方から使う。同じ種類のエラーは画面のどこで起きても同じ文言にするため。

---

## 7. 型定義

`src/types/board.ts` に、[API 設計書](api-design.md) 4. のリソース形式と 1 対 1 で対応する型を定義する。項目名・型・NULL 可否を API 設計書から変えてはならない。

| 型 | 定義 | 対応 |
| --- | --- | --- |
| `Priority` | `'high' \| 'medium' \| 'low'` | API 設計書 2. 方針 7 |
| `ListId` | `'todo' \| 'doing' \| 'done'` | API 設計書 2. 方針 7 |
| `BoardList` | `{ id: ListId; name: string; displayOrder: number }` | API 設計書 4.1 |
| `Card` | `{ id: number; title: string; description: string \| null; dueDate: string \| null; priority: Priority; listId: ListId; displayOrder: number; createdAt: string; updatedAt: string }` | API 設計書 4.2 |
| `CardCreateInput` | `{ title: string; priority: Priority; listId: ListId }` | API 設計書 8. の要求 body |

`dueDate` は `YYYY-MM-DD` の文字列、`createdAt` / `updatedAt` は ISO 8601（UTC）の文字列のまま保持し、`Date` 型には変換しない（表示するときに必要な形へ変換する）。

`CardCreateInput` の `priority` は API では省略可だが、フロントエンドでは常に送る。フォームの初期値が「中」であり、利用者が選んだ値をそのまま送る方が、「省略したときの既定値」という暗黙の規則に頼らずに済むため。

---

## 8. 表示ルール

### 8.1 優先度

| `priority` | 表示名 | 色 |
| --- | --- | --- |
| `high` | 高 | `#de350b`（赤） |
| `medium` | 中 | `#ff991f`（橙） |
| `low` | 低 | `#36b37e`（緑） |

表示名は `src/constants/priority.ts` の `PRIORITY_LABEL` に定数として持つ。色は `PriorityBadge.module.css` に持つ。追加フォームの選択肢の並び順（高 → 中 → 低）は同じファイルの `PRIORITIES` に配列として持ち、画面の並びと優先度の順位（[機能要件書](functional-requirements.md) 3.1）を一致させる。

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

### 8.5 カード追加フォームの挙動

[画面要件書](screen-requirements.md) 5.1「カード追加の入力欄」と画面モック `mock/script.js` の `renderAddForm` に合わせる。

#### `AddCardForm` が持つ状態

| 状態 | 型 | 初期値 | 意味 |
| --- | --- | --- | --- |
| `open` | `boolean` | `false` | 入力欄を開いているか。`false` のときは「＋ カードを追加」ボタンだけを表示する |
| `title` | `string` | `''` | 入力中のタイトル |
| `priority` | `Priority` | `'medium'` | 選択中の優先度（FR-01「初期値は中」） |
| `submitting` | `boolean` | `false` | 送信中かどうか。`true` の間は「追加」「キャンセル」を押せなくする（二重送信の防止） |
| `error` | `ApiError \| null` | `null` | 直前の送信で失敗したエラー。`null` なら文言を出さない |

#### 操作と動作

| 操作 | 動作 |
| --- | --- |
| 「＋ カードを追加」を押す | `open = true` にし、タイトルの入力欄にフォーカスを当てる |
| タイトルを入力する | `maxLength=100` で 100 文字を超えて入力できないようにする（API 側の 100 文字制限と同じ） |
| 優先度を選ぶ | ラジオボタン 3 つ（高 / 中 / 低）。ラベルには `PriorityBadge` を使い、カードと同じ見た目にする。`name` はリストごとに `add-priority-<listId>` とし、3 列のラジオが互いに干渉しないようにする |
| 「追加」を押す（または Enter） | `title` の前後の空白を除く。空なら **何もせず** 入力欄にフォーカスを戻す（FR-01「空のまま登録しようとした場合は登録を行わない」。エラー文言も出さない）。空でなければ `submitting = true` にして `onSubmit({ title, priority, listId })` を呼ぶ |
| 送信に成功 | `title = ''`、`priority = 'medium'`、`error = null` に戻し、入力欄は **開いたまま** フォーカスを戻す（続けて追加できるように。モックと同じ） |
| 送信に失敗 | `error` にそのエラーを入れ、入力欄の下に `errorMessage(error)`（6.3）を `role="alert"` で表示する。`title` と `priority` は消さない |
| 「キャンセル」を押す、または入力欄で Escape | `open = false` にし、`title` / `priority` / `error` を初期値に戻す |

送信の成否にかかわらず、終わったら `submitting = false` に戻す。

#### 配置

`BoardList` の中で、カード一覧（スクロールする領域）の **外側の最下部** に置く。カードが多くて列がスクロールしても「＋ カードを追加」が常に見えるようにするため（画面要件書 5.1 の画面イメージで各列の最下部にある）。

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
| 7 | ドラッグ&ドロップ、カード詳細は本版では置かない（「＋ カードを追加」は 2.0 で追加） | 2. | 2026-09-20 |
| 8 | 登録に成功したら、応答のカードを差し込むのではなく `GET /api/cards?listId=` でそのリストを取り直して置き換える（楽観更新はしない） | 2.、5.3 | 2026-09-21 |
| 9 | 登録の失敗は `useBoard` の `error` に入れず、`AddCardForm` が自分の状態として持ち、入力欄の下に文言を出す。入力内容は消さない | 2.、5.3、8.5 | 2026-09-21 |
| 10 | `AddCardForm` は API を直接呼ばず、`onSubmit` で渡された関数（`useBoard` の `addCard`）に送信を委ねる | 4.2 | 2026-09-21 |
| 11 | タイトルが空（空白のみ）のときは送信せず、エラー文言も出さずにフォーカスを戻すだけとする | 8.5 | 2026-09-21 |
| 12 | 登録に成功したら入力欄は開いたままにし、タイトルを空に・優先度を「中」に戻す | 8.5 | 2026-09-21 |

---

## 11. 保留事項

| 事項 | 保留理由 | 決定時期 |
| --- | --- | --- |
| カード詳細（SC-02）のコンポーネント構成と開閉の状態管理 | 取得 API（`GET /api/cards/{id}`）はあるが、編集 API が無い段階では読み取り専用の詳細を作る意味が薄い | 編集 API（FR-02, FR-06〜FR-08）の追記時 |
| ドラッグ&ドロップ（FR-04, FR-05）の実装と `@hello-pangea/dnd` の導入 | 移動・並べ替え API が無い | 移動 API の追記時 |
| 通信エラー時の再試行の仕組み（FR-09） | 登録の失敗は入力内容を残すので、利用者が「追加」を押し直せば再送できる。自動の再試行や「再試行」ボタンは、編集・移動など操作の種類が増えてから共通の形を考える | 編集・移動 API の追記時 |
| 登録の楽観更新（応答を待たずに画面へ差し込む） | カードは最大 100 件程度で応答は速く、取り直しで十分。並べ替えの規則をフロントエンドに持ち込まない方が単純 | 体感が遅いと分かったとき |
| テストの範囲 | 2.0 で `AddCardForm`（開閉・空タイトル・送信・失敗表示）と `Board`（登録から再取得までの流れ）に広げる。`useBoard` 単体のテストは `Board` のテストで代替する | 編集・移動が入り、`useBoard` が複雑になったとき |
