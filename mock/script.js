/* ============================================================
   タスク管理ボード モック
   - データはメモリ上にのみ保持する（FR-09 のサーバー保存はモック対象外）
   - 画面イメージと操作感の認識合わせを目的とする
   ============================================================ */

// ---------- 定数 ----------
const LISTS = [
  { id: 'todo',  name: '未着手' },
  { id: 'doing', name: '作業中' },
  { id: 'done',  name: '完了' },
];

const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }; // 並べ替え時の順序（小さいほど上）

// ---------- サンプルデータ ----------
// 期限は「今日から何日後か」で持たせ、いつ開いても期限切れの例が見えるようにする
function dateFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateString(d);
}

let cards = [
  { id: 1, listId: 'todo',  title: '資料作成', description: '来週の定例会議で使う資料。\n前回の議事録を参照すること。', due: dateFromToday(2),  priority: 'high' },
  { id: 2, listId: 'todo',  title: '買い物',   description: '牛乳、卵、パン',                                     due: dateFromToday(-3), priority: 'medium' },
  { id: 3, listId: 'todo',  title: '読書',     description: '',                                                    due: '',                priority: 'low' },
  { id: 4, listId: 'doing', title: '実装',     description: 'ログイン画面のバリデーションを追加する',              due: dateFromToday(7),  priority: 'medium' },
  { id: 7, listId: 'doing', title: '設計レビュー', description: '',                                                due: dateFromToday(1),  priority: 'high' },
  { id: 5, listId: 'done',  title: '掃除',     description: '',                                                    due: '',                priority: 'low' },
  { id: 6, listId: 'done',  title: '返信',     description: '田中さんへのメール返信',                              due: dateFromToday(-2), priority: 'medium' },
];
// 「作業中」と「完了」はあえて優先度順になっていない（低・中が高より上）。
// ツールバーの「優先度順に並べ替え」を押すと変化が分かる（FR-10）。

let nextId = 8;

// ---------- 日付ユーティリティ ----------
function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today() {
  return toDateString(new Date());
}

// 表示用 "MM/DD"
function formatDue(due) {
  const [, m, d] = due.split('-');
  return `${m}/${d}`;
}

// 期限切れ判定：期限が今日より前、かつ「完了」以外のリストにある
function isOverdue(card) {
  return card.due !== '' && card.due < today() && card.listId !== 'done';
}

// ---------- 優先度順の並べ替え ----------
// 指定リストのカードを 高→中→低 の順に並べ直す。
// 同じ優先度どうしは元の順序を保つ（Array.sort は安定ソート）ため、
// 末尾に置いてから呼べば「同じ優先度グループの末尾」に入る。
function sortListByPriority(listId) {
  const target = cards.filter((c) => c.listId === listId);
  const rest = cards.filter((c) => c.listId !== listId);
  target.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  cards = [...rest, ...target];
}

// 全リストを優先度順に並べ直す（FR-10）。同じ優先度の中の順序は sortListByPriority が保つ。
function sortAllByPriority() {
  LISTS.forEach((list) => sortListByPriority(list.id));
}

// ---------- ボード描画 ----------
const boardEl = document.getElementById('board');

function renderBoard() {
  boardEl.innerHTML = '';

  LISTS.forEach((list) => {
    const listCards = cards.filter((c) => c.listId === list.id);

    const listEl = document.createElement('section');
    listEl.className = 'list';
    listEl.dataset.listId = list.id;

    // リスト見出し
    const header = document.createElement('div');
    header.className = 'list-header';
    header.innerHTML = `<span>${list.name}</span><span class="list-count">${listCards.length}件</span>`;
    listEl.appendChild(header);

    // カード一覧
    const container = document.createElement('div');
    container.className = 'card-container';
    container.dataset.listId = list.id;
    listCards.forEach((card) => container.appendChild(createCardElement(card)));
    setupDropZone(container);
    listEl.appendChild(container);

    // カード追加
    const addArea = document.createElement('div');
    addArea.className = 'add-area';
    renderAddButton(addArea, list.id);
    listEl.appendChild(addArea);

    boardEl.appendChild(listEl);
  });
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.cardId = card.id;

  const overdue = isOverdue(card);
  const dueText = card.due === ''
    ? ''
    : `期限 ${formatDue(card.due)}${overdue ? '（期限切れ）' : ''}`;

  el.innerHTML = `
    <div class="card-title-row">
      <span class="badge badge-${card.priority}">${PRIORITY_LABEL[card.priority]}</span>
      <span class="card-title"></span>
    </div>
    <div class="card-due ${overdue ? 'overdue' : ''}">${dueText}</div>
  `;
  el.querySelector('.card-title').textContent = card.title;

  el.addEventListener('click', () => openDetail(card.id));
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend', onDragEnd);

  return el;
}

// ---------- カード追加（FR-01） ----------
function renderAddButton(addArea, listId) {
  addArea.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-add';
  btn.textContent = '＋ カードを追加';
  btn.addEventListener('click', () => renderAddForm(addArea, listId));
  addArea.appendChild(btn);
}

function renderAddForm(addArea, listId) {
  const radioName = `add-priority-${listId}`;
  addArea.innerHTML = `
    <form class="add-form">
      <input type="text" placeholder="タイトルを入力" maxlength="100">
      <div class="priority-options priority-options-compact">
        <label><input type="radio" name="${radioName}" value="high"> <span class="badge badge-high">高</span></label>
        <label><input type="radio" name="${radioName}" value="medium" checked> <span class="badge badge-medium">中</span></label>
        <label><input type="radio" name="${radioName}" value="low"> <span class="badge badge-low">低</span></label>
      </div>
      <div class="add-form-buttons">
        <button type="submit" class="btn-primary">追加</button>
        <button type="button" class="btn-secondary btn-cancel">キャンセル</button>
      </div>
    </form>
  `;
  const form = addArea.querySelector('form');
  const input = form.querySelector('input[type="text"]');
  input.focus();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (title === '') {
      // タイトルが空のときは登録しない
      input.focus();
      return;
    }
    const priority = form.querySelector(`input[name="${radioName}"]:checked`).value;
    cards.push({
      id: nextId++,
      listId,
      title,
      description: '',
      due: '',
      priority, // 初期値は「中」（フォームで変更可）
    });
    sortListByPriority(listId); // 追加後はリスト全体を優先度順に並べ直す
    renderBoard();
    // 続けて追加できるよう、同じリストの入力欄を開いたままにする
    const newAddArea = boardEl.querySelector(`.list[data-list-id="${listId}"] .add-area`);
    renderAddForm(newAddArea, listId);
  });

  form.querySelector('.btn-cancel').addEventListener('click', () => renderAddButton(addArea, listId));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') renderAddButton(addArea, listId);
  });
}

// ---------- ドラッグ&ドロップ（FR-04, FR-05） ----------
let draggingCardId = null;
let placeholderEl = null;

function onDragStart(e) {
  draggingCardId = Number(e.currentTarget.dataset.cardId);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';

  placeholderEl = document.createElement('div');
  placeholderEl.className = 'placeholder';
}

function onDragEnd() {
  document.querySelectorAll('.card.dragging').forEach((el) => el.classList.remove('dragging'));
  if (placeholderEl && placeholderEl.parentNode) placeholderEl.remove();
  placeholderEl = null;
  draggingCardId = null;
}

function setupDropZone(container) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault(); // ドロップを許可
    if (!placeholderEl) return;

    // マウス位置より下にある最初のカードの前にプレースホルダーを入れる
    const cardEls = [...container.querySelectorAll('.card:not(.dragging)')];
    const nextCard = cardEls.find((el) => {
      const rect = el.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });
    if (nextCard) {
      container.insertBefore(placeholderEl, nextCard);
    } else {
      container.appendChild(placeholderEl);
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggingCardId === null || !placeholderEl) return;

    const targetListId = container.dataset.listId;
    // プレースホルダーの位置＝挿入先インデックス（ドラッグ中カードは除外して数える）
    const siblings = [...container.children].filter((el) => !el.classList.contains('dragging'));
    const insertIndex = siblings.indexOf(placeholderEl);

    moveCard(draggingCardId, targetListId, insertIndex);
    onDragEnd();
    renderBoard();
  });
}

function moveCard(cardId, targetListId, insertIndex) {
  const card = cards.find((c) => c.id === cardId);
  const others = cards.filter((c) => c.id !== cardId);

  const targetCards = others.filter((c) => c.listId === targetListId);
  const restCards = others.filter((c) => c.listId !== targetListId);

  card.listId = targetListId;
  targetCards.splice(insertIndex, 0, card);

  cards = [...restCards, ...targetCards];
}

// ---------- カード詳細（SC-02 / FR-02, FR-03, FR-06, FR-07, FR-08） ----------
const overlayEl = document.getElementById('modal-overlay');
const titleInput = document.getElementById('detail-title');
const descInput = document.getElementById('detail-description');
const dueInput = document.getElementById('detail-due');
const priorityRadios = document.querySelectorAll('input[name="priority"]');
let editingCardId = null;

function openDetail(cardId) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;
  editingCardId = cardId;

  titleInput.value = card.title;
  descInput.value = card.description;
  dueInput.value = card.due;
  priorityRadios.forEach((r) => { r.checked = r.value === card.priority; });

  overlayEl.hidden = false;
  titleInput.focus();
}

function closeDetail() {
  overlayEl.hidden = true;
  editingCardId = null;
}

// 入力のたびに即時反映（閉じる前に保存済みという要件を表現）
function updateEditingCard(changes) {
  const card = cards.find((c) => c.id === editingCardId);
  if (!card) return;
  Object.assign(card, changes);
  renderBoard();
}

titleInput.addEventListener('input', () => {
  const title = titleInput.value.trim();
  if (title !== '') updateEditingCard({ title }); // 空タイトルは反映しない
});
descInput.addEventListener('input', () => updateEditingCard({ description: descInput.value }));
dueInput.addEventListener('change', () => updateEditingCard({ due: dueInput.value }));
priorityRadios.forEach((r) => {
  r.addEventListener('change', () => {
    if (!r.checked) return;
    const card = cards.find((c) => c.id === editingCardId);
    if (!card) return;
    // 優先度を変えたカードは、同じリストの末尾に移してから優先度順に並べ直す
    // → 変更後の優先度グループの末尾に入る
    card.priority = r.value;
    cards = [...cards.filter((c) => c.id !== card.id), card];
    sortListByPriority(card.listId);
    renderBoard();
  });
});

document.getElementById('btn-close').addEventListener('click', closeDetail);
overlayEl.addEventListener('click', (e) => {
  if (e.target === overlayEl) closeDetail(); // 背景クリックでも閉じる
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlayEl.hidden) closeDetail();
});

// 削除（確認なし）
document.getElementById('btn-delete').addEventListener('click', () => {
  cards = cards.filter((c) => c.id !== editingCardId);
  closeDetail();
  renderBoard();
});

// ---------- ツールバー：全リストの優先度順並べ替え（FR-10） ----------
document.getElementById('btn-sort').addEventListener('click', () => {
  sortAllByPriority();
  renderBoard();
});

// ---------- 初期表示 ----------
renderBoard();
