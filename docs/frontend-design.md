# タスク管理アプリ フロントエンド設計書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ フロントエンド設計書 |
| 版数 | 3.0 |
| 作成日 | 2026-09-20 |
| 最終更新日 | 2026-09-21 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 上位文書 | [画面要件書](screen-requirements.md) |
| 関連文書 | [要件定義書](requirements.md)、[機能要件書](functional-requirements.md)、[データ設計書](data-design.md)、[API 設計書](api-design.md)、[技術スタック](tech-stack.md) |

本書は、[画面要件書](screen-requirements.md) で定義した画面を React でどう組み立てるかを定義する。具体的には、**画面をどのコンポーネントに分けるか、取得したデータをどこで保持するか、バックエンドの API をどう呼ぶか、区分値や日付をどう表示するか、開発サーバーからバックエンドへどう接続するか** を決める。

1.0 では **ボード画面（SC-01）の表示**、2.0 で **カードの登録（FR-01）** を対象とした。本版（3.0）では **カード詳細（SC-02）での編集（FR-02, FR-06, FR-07, FR-08）** と **ドラッグ&ドロップによる移動・並べ替え（FR-04, FR-05）** を追加する。削除（FR-03）は、対応する API が [API 設計書](api-design.md) に追記された時点で本書にも追記する（11. 保留事項）。

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
| 3.0 | 2026-09-21 | カード詳細（SC-02）での編集と、ドラッグ&ドロップによる移動・並べ替えを追加。`CardDetail` コンポーネントと D&D の構成（4.）、編集・移動の流れ（5.4・5.5）、`apiPut`（6.1）、`CardUpdateInput` / `CardMoveInput`（7.）、カード詳細の挙動（8.6）と D&D（8.7）を定義。方針 6〜9 と決定事項・保留事項を更新 | KeiT0773 |

---

## 2. 設計方針

| No | 事項 | 決定 | 理由 |
| --- | --- | --- | --- |
| 1 | バックエンドとの接続 | 開発時は Vite の開発サーバーが持つ **プロキシ機能** で `/api` 以下の要求をバックエンド（`http://localhost:8080`）へ転送する。フロントエンドのコードは `fetch('/api/cards')` のように **相対パス** で呼ぶ | バックエンドに CORS（別オリジンからのアクセス許可）の設定を追加せずに済む。[API 設計書](api-design.md) 2. 方針 1「将来フロントエンドを同じサーバーから配信する」と整合し、配置形態が変わってもフロントエンドのコードを変更しなくてよい |
| 2 | 状態管理 | 状態管理ライブラリは導入しない。取得したリストとカードは、ボードを描画するコンポーネントの直下にあるカスタムフック `useBoard` が React 標準の `useState` / `useEffect` で保持する | 画面は 1 つ、データは最大 100 件程度（[要件定義書](requirements.md) 5.1）。[技術スタック](tech-stack.md) 2.「必要になるまでライブラリを追加しない」 |
| 3 | スタイル | CSS Modules を使い、画面モック `mock/style.css` をコンポーネントごとの `*.module.css` に分割して移植する。全体に効かせる指定（`*` と `body`）だけをグローバルの `index.css` に置く | モックで確認済みの見た目をそのまま再現できる。クラス名がコンポーネントごとに閉じるため、名前の衝突を気にしなくてよい |
| 4 | 区分値の表示名 | `priority`（`high` / `medium` / `low`）を「高 / 中 / 低」に変換するのはフロントエンドの責務とする。リストの表示名（未着手 / 作業中 / 完了）は API の `name` をそのまま使う | [API 設計書](api-design.md) 2. 方針 7 |
| 5 | 期限超過の判定 | フロントエンドが表示のたびに判定する | [データ設計書](data-design.md) 5.4。API は判定結果を返さない |
| 6 | 今回置かない要素 | カード詳細の「カードを削除」ボタンは本版では置かない。「＋ カードを追加」は 2.0 で、カード詳細とドラッグ&ドロップは 3.0 で追加した | 対応する API が無く、押しても動かない要素を置くより、機能の実装時に追加する方が混乱がない |
| 7 | 通信エラーの通知 | **取得**に失敗したときは、ボードの代わりにその旨の文言を表示する。**登録・編集**に失敗したときは、その入力欄の下に文言を表示し、入力した内容は消さずに残す。**移動**に失敗したときは、カードを元の位置に戻し、ボードの上部に文言を表示する | FR-09「保存されていないことを利用者に分かるように通知する」。取得の失敗は画面全体が成り立たないのでボードごと差し替えるが、登録・編集の失敗は「その 1 件が保存されていない」ことなので、ボードは表示したまま該当の入力欄で伝える。入力を残すのは、利用者がもう一度打ち直さずに再送できるようにするため。移動には入力欄が無いので、ボード全体に対する文言で伝える |
| 8 | 書き込み後の画面反映 | 登録・編集・移動に成功したら、応答のカード 1 件を手元の一覧に差し込むのではなく、`GET /api/cards?listId=` で影響を受けたリスト（移動なら移動元と移動先の 2 つ）を取り直して置き換える | サーバーがリスト内を並べ直したり振り直したりするため、他のカードの `displayOrder` も変わりうる（[API 設計書](api-design.md) 8.・9.・10. の「画面へ反映する方法」）。取り直せば並べ替えの規則をフロントエンドに持たなくて済み、方針「フロントエンドでは並べ替えない」（5.1）を保てる |
| 9 | ドラッグ&ドロップだけは楽観更新する | ドロップした瞬間に、API の応答を待たずに手元の `cards` をドロップ後の並びに変える。そのあと API を呼び、成功したら方針 8 のとおり取り直し、失敗したら取り直して元に戻す | ドロップ直後にカードが元の位置へ戻り、応答が来てから移動先に現れると、操作が失敗したように見える（D&D ライブラリも、ドロップ時に同期的に並びを更新することを前提にしている）。ここで行うのは「ドロップされた位置に置く」だけで、優先度順の並べ替え規則はフロントエンドに持たない（方針 8 の原則は維持） |

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
    │   └── board.ts            API の要求・応答に対応する型（Priority, ListId, BoardList, Card, CardCreateInput, CardUpdateInput, CardMoveInput）
    ├── api/
    │   ├── client.ts           fetch の共通処理（apiGet, apiPost, apiPut, ApiError）
    │   ├── lists.ts            GET /api/lists
    │   └── cards.ts            GET /api/cards、POST /api/cards、PUT /api/cards/{id}、PUT /api/cards/{id}/position
    ├── hooks/
    │   └── useBoard.ts         リストとカードの取得・保持と、カードの登録・編集・移動
    ├── utils/
    │   ├── date.ts             日付の書式変換と期限超過の判定
    │   ├── errorMessage.ts     ApiError から表示文言への変換（6.3）
    │   └── board.ts            ドロップ結果を cards に反映する純粋関数（applyMove, dragEndToMove）
    ├── constants/
    │   └── priority.ts         優先度の表示名と並び順
    ├── components/
    │   ├── AppHeader/          ヘッダー
    │   ├── Board/              ボード（3 列の親。読み込み中・エラーの表示もここ）
    │   ├── BoardList/          1 つのリスト（列）
    │   ├── Card/               1 枚のカード
    │   ├── AddCardForm/        「＋ カードを追加」ボタンと入力フォーム
    │   ├── CardDetail/         カード詳細（SC-02）のモーダル
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
└── Board                       ← useBoard() でデータを取得・登録・編集・移動。DragDropContext を張る
    ├── （移動に失敗したときの文言）
    ├── BoardList（未着手）      ← Droppable（カード一覧の領域）
    │   ├── Card                ← Draggable。クリックで CardDetail を開く
    │   │   └── PriorityBadge
    │   ├── Card ...
    │   └── AddCardForm         ← 列の最下部。閉じているときはボタン、開くと入力欄
    │       └── PriorityBadge   （優先度の選択肢のラベル）
    ├── BoardList（作業中）
    ├── BoardList（完了）
    └── CardDetail              ← 選択中のカードがあるときだけ描画。ボードの手前に重ねる
        └── PriorityBadge       （優先度の選択肢のラベル）
```

### 4.2 各コンポーネントの責務と props

| コンポーネント | 責務 | props | 対応する要件 |
| --- | --- | --- | --- |
| `App` | `AppHeader` と `Board` を縦に並べる。それ以外の処理は持たない | なし | — |
| `AppHeader` | 画面上部の青い帯にアプリ名「タスク管理ボード」を表示する | なし | SC-01 |
| `Board` | `useBoard` を呼び、状態に応じて「読み込み中」「エラー文言」「3 つの `BoardList`」のいずれかを描画する。各 `BoardList` には、そのリストに属するカードと、登録用の `addCard`、カードをクリックしたときの処理を渡す。**選択中のカードの `id`**（`selectedCardId`）を持ち、該当カードがあれば `CardDetail` を描画する。`DragDropContext` を張り、ドロップ時（`onDragEnd`）に `moveCard` を呼ぶ。移動に失敗したときの文言もここで表示する | なし | SC-01、SC-02、画面構成 3.「3 つのリストを横に並べる」「別ページへは遷移しない」 |
| `BoardList` | リストの見出し（`name`）と件数（`n件`）、カードの一覧、最下部に `AddCardForm` を縦に描画する。カードが多いときは列の中だけをスクロールさせる（`AddCardForm` はスクロール領域の外に置き、常に見える）。カード一覧の領域を `Droppable`（`droppableId = list.id`）にする | `list: BoardList`、`cards: Card[]`、`onAddCard: (input: CardCreateInput) => Promise<void>`、`onCardClick: (id: number) => void` | 画面構成 3.「カードを表示順に従って縦に並べる」、画面要件書 5.1、FR-04 |
| `Card` | カード 1 枚。優先度バッジ、タイトル、期限の行を表示する。期限超過なら強調表示する。`Draggable`（`draggableId = String(card.id)`、`index` は列内の順番）でつかんで動かせ、クリックで `onClick` を呼ぶ。キーボードでも Enter で開ける | `card: Card`、`index: number`、`onClick: () => void` | 画面構成 3.「タイトル・優先度・期限が読み取れる」「カードをクリックするとカード詳細が開く」、FR-04、FR-05、FR-07、FR-08 |
| `AddCardForm` | 閉じているときは「＋ カードを追加」ボタンを表示する。押すと、その場にタイトルの入力欄・優先度の選択（高 / 中 / 低）・「追加」「キャンセル」ボタンを表示する。入力内容・開閉・送信中・失敗の状態を自分で持ち、送信は `onSubmit` に委ねる（8.5） | `listId: ListId`、`onSubmit: (input: CardCreateInput) => Promise<void>` | FR-01、画面要件書 5.1「カード追加の入力欄」 |
| `CardDetail` | カード詳細（SC-02）。ボードの手前に重ねるモーダルで、タイトル・説明文・期限・優先度の入力欄と「閉じる」ボタンを持つ。項目ごとの下書き・保存中・失敗の状態を自分で持ち、項目が確定したときに `onSave` へ 4 項目をまとめて渡す（8.6）。閉じる操作は `onClose` に委ねる | `card: Card`、`onSave: (input: CardUpdateInput) => Promise<void>`、`onClose: () => void` | SC-02、FR-02、FR-06、FR-07、FR-08 |
| `PriorityBadge` | 優先度を表示名（高 / 中 / 低）と色で表示する | `priority: Priority` | FR-08「色付きの表示」 |

`AddCardForm` と `CardDetail` が API を直接呼ばず `onSubmit` を受け取るのは、**カードの一覧（`cards`）を持っているのが `useBoard` だけ** だからである。登録後の一覧の更新は `useBoard` の `addCard`（5.3）が行い、`AddCardForm` は「送信して、成功か失敗かを知る」ことだけに責任を持つ。`CardDetail` も同じで、編集後の一覧の更新は `useBoard` の `updateCard`（5.4）が行う。この分け方にしておくと、これらのコンポーネントのテストは渡した関数の呼ばれ方を見るだけで済む。

`CardDetail` に渡す `card` は、`Board` が `selectedCardId` で `useBoard` の `cards` から探したものである。カード詳細を開くときに `GET /api/cards/{id}` は呼ばない。利用者は 1 名で、手元の `cards` は書き込みのたびに取り直しているため（方針 8）、常に最新だからである。`cards` にそのカードが無くなったとき（将来の削除）は `CardDetail` を閉じる。

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

### 5.4 編集の流れ

```ts
updateCard(id: number, input: CardUpdateInput): Promise<void>
```

```
CardDetail で項目が確定する（8.6）
  → onSave（= useBoard の updateCard）に 4 項目 { title, description, dueDate, priority } を渡す
  → PUT /api/cards/{id} に送る
  → 成功（200）したら、そのカードの listId（cards から引く）で GET /api/cards?listId= を呼び、リストを取り直す
  → cards のうちそのリストのカードを置き換える（5.3 と同じ形）
  → Board が再描画され、CardDetail に渡る card も新しい値になる。優先度を変えたときはカードの位置が変わる
```

失敗したときは `ApiError` をそのまま投げ、`cards` は変更しない。`CardDetail` がその項目の下に文言を出し、入力は残す（8.6）。優先度以外の編集でもリストを取り直すのは、「編集したら取り直す」の 1 通りにそろえて分岐を増やさないためである（[API 設計書](api-design.md) 9.「編集後に画面へ反映する方法」）。

### 5.5 移動の流れ

```ts
moveCard(id: number, to: CardMoveInput): Promise<void>
```

```
カードをドロップする
  → Board の onDragEnd が結果を受け取り、dragEndToMove（utils/board.ts）で { cardId, listId, displayOrder } に変換する
    （ドロップ先が無い、または元と同じ位置なら null を返し、何もしない）
  → useBoard の moveCard を呼ぶ
  → まず setCards(prev => applyMove(prev, id, listId, displayOrder)) で手元の並びをドロップ後の形にする（楽観更新。方針 9）
  → PUT /api/cards/{id}/position に { listId, displayOrder } を送る
  → 成功（200）したら、移動元と移動先のリストを GET /api/cards?listId= で取り直して置き換える（同じリストなら 1 回）
  → 失敗したら GET /api/cards で全件を取り直して置き換え（サーバーの状態＝元の位置に戻る）、ApiError を投げる
  → Board が文言を上部に表示する（方針 7）
```

`applyMove(cards, cardId, toListId, toIndex)` は、`cards` からそのカードを取り除き、`listId` を `toListId` に書き換えて、移動先リストのカード列の `toIndex` 番目に差し込んだ新しい配列を返す純粋関数である。`displayOrder` の値は書き換えない（画面は配列の順番で描画しており、`displayOrder` は表示に使っていない。正しい値は取り直しで入る）。純粋関数にしておくのは、D&D の操作そのものを自動テストで再現しにくいため、並びの計算だけを単体テストで確かめるためである（11. 保留事項）。

`useBoard` が返すものは、5.2 の 4 つに `addCard`・`updateCard`・`moveCard` を加えた 7 つになる。

---

## 6. API 呼び出しの方針

### 6.1 共通処理 `apiGet` / `apiPost` / `apiPut`

`src/api/client.ts` に、GET・POST・PUT の共通処理を置く。個々の API（`lists.ts`、`cards.ts`）はこれを呼ぶだけの薄い関数とし、パスと要求・戻り値の型だけを持つ。

```ts
export async function apiGet<T>(path: string): Promise<T>;
export async function apiPost<TBody, T>(path: string, body: TBody): Promise<T>;
export async function apiPut<TBody, T>(path: string, body: TBody): Promise<T>;
```

`apiPost` と `apiPut` は `Content-Type: application/json` を付け、`body` を `JSON.stringify` して送る。3 つの関数は内部の共通処理（`fetch` の実行と応答の判定）を共有し、違いは HTTP メソッドと body の有無だけとする。

| 状況 | 動作 |
| --- | --- |
| `fetch` 自体が失敗した（サーバー停止、ネットワーク未接続など。`TypeError` が投げられる） | `ApiError(null, 'サーバーに接続できません')` を投げる |
| 応答が `2xx` 以外 | 本文を `ProblemDetail`（[API 設計書](api-design.md) 2.1）として読み、`ApiError(status, detail)` を投げる。本文が読めなければ `title` または HTTP ステータスの文言を使う。入力チェックのエラー（400）は `detail` に項目ごとのメッセージが連結されているので、`errors` は読まない |
| 応答が `2xx`（`200` も `201` も） | 本文の JSON を `T` として返す |

`cards.ts` の関数は次の 2 つになる。

```ts
export function getCards(listId?: ListId): Promise<Card[]>;                     // GET /api/cards[?listId=]
export function createCard(input: CardCreateInput): Promise<Card>;              // POST /api/cards
export function updateCard(id: number, input: CardUpdateInput): Promise<Card>;  // PUT /api/cards/{id}
export function moveCard(id: number, input: CardMoveInput): Promise<Card>;      // PUT /api/cards/{id}/position
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

この変換は `src/utils/errorMessage.ts` の `errorMessage(error: ApiError): string` に置き、ボード全体のエラー表示（`Board`）、登録失敗（`AddCardForm`）、編集失敗（`CardDetail`）、移動失敗（`Board` 上部）のすべてから使う。同じ種類のエラーは画面のどこで起きても同じ文言にするため。

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
| `CardUpdateInput` | `{ title: string; description: string \| null; dueDate: string \| null; priority: Priority }` | API 設計書 9. の要求 body |
| `CardMoveInput` | `{ listId: ListId; displayOrder: number }` | API 設計書 10. の要求 body |

`dueDate` は `YYYY-MM-DD` の文字列、`createdAt` / `updatedAt` は ISO 8601（UTC）の文字列のまま保持し、`Date` 型には変換しない（表示するときに必要な形へ変換する）。

`CardUpdateInput` の `description` と `dueDate` は、入力欄が空のとき `''` ではなく `null` にして送る（API 設計書 2. 方針 6、データ設計書 2. 方針 4）。`CardCreateInput` の `priority` は API では省略可だが、フロントエンドでは常に送る。フォームの初期値が「中」であり、利用者が選んだ値をそのまま送る方が、「省略したときの既定値」という暗黙の規則に頼らずに済むため。

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

### 8.6 カード詳細（SC-02）の挙動

[画面要件書](screen-requirements.md) 5.2 と画面モック `mock/index.html` / `mock/script.js` の詳細モーダルに合わせる。ただしモックは入力のたびに即時反映していたのに対し、実装では **項目ごとに確定したときにサーバーへ保存する**。「保存」ボタンは置かない（画面要件書 5.2「編集内容は閉じる前に保存されている」）。

#### `CardDetail` が持つ状態

| 状態 | 型 | 初期値 | 意味 |
| --- | --- | --- | --- |
| `title` | `string` | `card.title` | タイトルの下書き |
| `description` | `string` | `card.description ?? ''` | 説明文の下書き（入力欄は文字列なので `null` は `''` にする） |
| `dueDate` | `string` | `card.dueDate ?? ''` | 期限の下書き（`<input type="date">` の値。未設定は `''`） |
| `priority` | `Priority` | `card.priority` | 優先度 |
| `saving` | `boolean` | `false` | 保存中かどうか。保存中は入力欄を無効にし、二重送信を防ぐ |
| `error` | `ApiError \| null` | `null` | 直前の保存で失敗したエラー |

下書きは `card` から初期化する。`Board` は `CardDetail` を `key={card.id}` で描画し、別のカードを開いたときは新しく作り直す（下書きが混ざらない）。

#### 保存の契機と動作

| 項目 | 入力欄 | 保存の契機 |
| --- | --- | --- |
| タイトル | `<input type="text" maxLength={100}>` | 入力欄からフォーカスが外れたとき（blur）、または Enter |
| 説明文 | `<textarea maxLength={2000}>` | 入力欄からフォーカスが外れたとき（blur）。Enter は改行 |
| 期限 | `<input type="date">` | 値が変わったとき（change）。空にすると解除 |
| 優先度 | ラジオボタン 3 つ（ラベルは `PriorityBadge`） | 選び直したとき（change） |

保存の手順はどの項目でも同じで、次のとおり。

1. タイトルは前後の空白を除く。**空白のみなら保存せず、下書きを `card.title` に戻す**（FR-01 と同じく空のタイトルは受け付けない。文言は出さない）。
2. 4 項目の下書きを `CardUpdateInput` にまとめる（`description` と `dueDate` は `''` を `null` に）。**現在の `card` と同じ内容なら送らない**（フォーカスが外れただけで何も変えていないときに通信しない）。
3. `saving = true` にして `onSave(input)` を呼ぶ。
4. 成功したら `error = null`。`card` が新しい値で渡ってくるので、下書きは `card` の値にそろえる（サーバーが `title` を trim した結果など）。
5. 失敗したら `error` にそのエラーを入れ、入力欄の下に `errorMessage(error)`（6.3）を `role="alert"` で表示する。下書きは消さない（打ち直さずに再送できる）。
6. `saving = false` に戻す。

#### 開閉

| 操作 | 動作 |
| --- | --- |
| ボード上のカードをクリック（または Enter） | `Board` が `selectedCardId` にその `id` を入れ、`CardDetail` が描画される。開いたらタイトルの入力欄にフォーカスを当てる |
| 「閉じる」ボタン、背景（モーダルの外側）のクリック、Escape | `onClose` を呼び、`Board` が `selectedCardId` を `null` にする。保存中（`saving`）でも閉じてよい（保存はそのまま続き、結果は `cards` に反映される） |

モーダルは `role="dialog"` と `aria-modal="true"` を付け、見出し「カード詳細」を `aria-labelledby` で結びつける。フッターの「カードを削除」ボタン（画面要件書 5.2）は削除 API が無いため本版では置かず、削除の実装時に追加する（方針 6）。

### 8.7 ドラッグ&ドロップ

`@hello-pangea/dnd`（[技術スタック](tech-stack.md) 4.）を使う。3 つの部品の置き場所は次のとおり。

| 部品 | 置く場所 | 設定 |
| --- | --- | --- |
| `DragDropContext` | `Board`。3 列すべてを包む | `onDragEnd={handleDragEnd}` |
| `Droppable` | `BoardList` のカード一覧の領域（`.cards`） | `droppableId={list.id}`。`provided.innerRef` / `provided.droppableProps` を領域の要素に付け、子の末尾に `provided.placeholder` を必ず置く |
| `Draggable` | `Card` | `draggableId={String(card.id)}`（文字列であること）、`index` は列内の順番。`provided.innerRef` / `draggableProps` / `dragHandleProps` をカードの要素に付ける |

- **挿入位置の表示**（FR-04「ドラッグ中はカードが移動先のどこに挿入されるかを視覚的に示す」）は、ライブラリが他のカードをずらして隙間を作ることで満たす。モックの点線のプレースホルダーは使わない。
- ドラッグ中のカードは `snapshot.isDragging` を見て `.dragging`（不透明度 0.4、モックと同じ）を付ける。カードの `cursor` は `grab` にする。
- **クリックとドラッグの区別** はライブラリが行う。数ピクセル動かすまではクリックとして扱われ、`onClick` が呼ばれる。動かし始めるとクリックにはならない。
- `onDragEnd` の結果（`DropResult`）の判定は `utils/board.ts` の `dragEndToMove(result)` に切り出す。`destination` が無い（列の外でドロップ）か、`source` と `destination` が同じ `droppableId`・同じ `index` なら `null`（何もしない）。それ以外は `{ cardId: Number(draggableId), listId: destination.droppableId, displayOrder: destination.index }` を返す。`destination.index` は「自分を除いた並びでの位置」で、API 設計書 10. の `displayOrder` と同じ定義なので、そのまま送れる。
- 移動に失敗したときの文言は `Board` が上部に `role="alert"` で表示し、「閉じる」ボタンで消せる。次の移動・編集・登録が成功したときにも消す。
- 完了列へ動かしたカードは、`isOverdue` が `listId !== 'done'` を見ている（8.3）ため、期限を過ぎていても「（期限切れ）」の強調が自動で消える。追加の実装は要らない。
- ライブラリは React の `StrictMode`（開発モードでの二重描画）に対応しているため、`main.tsx` の `StrictMode` はそのままでよい。

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
| 7 | 対応する API が無い要素は置かない（「＋ カードを追加」は 2.0、カード詳細とドラッグ&ドロップは 3.0 で追加。「カードを削除」は削除 API の追記時） | 2. | 2026-09-20 |
| 8 | 登録に成功したら、応答のカードを差し込むのではなく `GET /api/cards?listId=` でそのリストを取り直して置き換える（楽観更新はしない） | 2.、5.3 | 2026-09-21 |
| 9 | 登録の失敗は `useBoard` の `error` に入れず、`AddCardForm` が自分の状態として持ち、入力欄の下に文言を出す。入力内容は消さない | 2.、5.3、8.5 | 2026-09-21 |
| 10 | `AddCardForm` は API を直接呼ばず、`onSubmit` で渡された関数（`useBoard` の `addCard`）に送信を委ねる | 4.2 | 2026-09-21 |
| 11 | タイトルが空（空白のみ）のときは送信せず、エラー文言も出さずにフォーカスを戻すだけとする | 8.5 | 2026-09-21 |
| 12 | 登録に成功したら入力欄は開いたままにし、タイトルを空に・優先度を「中」に戻す | 8.5 | 2026-09-21 |
| 13 | カード詳細は「保存」ボタンを置かず、項目ごとに確定したとき（タイトル・説明文は blur、期限・優先度は change）に 4 項目をまとめて `PUT` する。変更が無ければ送らない | 8.6 | 2026-09-21 |
| 14 | カード詳細に渡すカードは `useBoard` の `cards` から探し、`GET /api/cards/{id}` は呼ばない | 4.2 | 2026-09-21 |
| 15 | 編集の失敗はその項目の下に、移動の失敗はボード上部に文言を出す。編集の入力は消さず、移動はサーバーの状態を取り直して元に戻す | 2.、5.4、5.5 | 2026-09-21 |
| 16 | ドラッグ&ドロップだけは楽観更新する。ドロップ後の並びの計算は `applyMove` に閉じ込め、優先度順の規則はフロントエンドに持たない | 2.、5.5 | 2026-09-21 |
| 17 | 挿入位置の表示は `@hello-pangea/dnd` の標準の挙動（カードがずれて隙間ができる）で満たし、モックの点線プレースホルダーは再現しない | 8.7 | 2026-09-21 |
| 18 | カード詳細の「カードを削除」ボタンは削除 API の追記時に追加する | 2.、8.6 | 2026-09-21 |

---

## 11. 保留事項

| 事項 | 保留理由 | 決定時期 |
| --- | --- | --- |
| カードの削除（FR-03）と、カード詳細の「カードを削除」ボタン | 削除 API が無い | 削除 API の追記時 |
| 通信エラー時の再試行の仕組み（FR-09） | 登録・編集の失敗は入力内容を残すので、利用者がもう一度確定すれば再送できる。移動の失敗は元に戻るので、もう一度ドラッグすればよい。自動の再試行や「再試行」ボタンは、この運用で不便が分かってから考える | 不便が分かったとき |
| 登録・編集の楽観更新（応答を待たずに画面へ反映する） | カードは最大 100 件程度で応答は速く、取り直しで十分。並べ替えの規則をフロントエンドに持ち込まない方が単純。D&D だけは操作の性質上、楽観更新にした（方針 9） | 体感が遅いと分かったとき |
| ドラッグ&ドロップ操作の自動テスト | `@hello-pangea/dnd` のドラッグはマウスの移動を伴い、jsdom で再現しにくい。並びの計算（`applyMove`）とドロップ結果の判定（`dragEndToMove`）を純粋関数にして単体テストで確かめ、ドラッグ操作そのものはブラウザで手動確認する | ブラウザを使う自動テスト（Playwright など）を導入するとき |
| テストの範囲 | 3.0 で `CardDetail`（表示・項目ごとの保存・空タイトル・失敗表示・閉じる）と `utils/board.ts` に広げる。`useBoard` 単体のテストは引き続き `Board` のテストで代替する | `useBoard` がさらに複雑になったとき |
