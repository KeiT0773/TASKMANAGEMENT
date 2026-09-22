import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoardList, Card } from '../../types/board';
import { Board } from './Board';

const lists: BoardList[] = [
  { id: 'todo', name: '未着手', displayOrder: 0 },
  { id: 'doing', name: '作業中', displayOrder: 1 },
  { id: 'done', name: '完了', displayOrder: 2 },
];

const cards: Card[] = [
  {
    id: 1,
    title: '資料作成',
    description: null,
    dueDate: null,
    priority: 'high',
    listId: 'todo',
    displayOrder: 0,
    createdAt: '2026-09-20T01:00:00Z',
    updatedAt: '2026-09-20T01:00:00Z',
  },
  {
    id: 2,
    title: '実装',
    description: null,
    dueDate: null,
    priority: 'medium',
    listId: 'doing',
    displayOrder: 0,
    createdAt: '2026-09-20T01:00:00Z',
    updatedAt: '2026-09-20T01:00:00Z',
  },
];

/** JSON を返す Response を作る */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Board', () => {
  it('リストとカードを取得して 3 列に振り分けて表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(path === '/api/lists' ? jsonResponse(lists) : jsonResponse(cards)),
      ),
    );

    render(<Board />);
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();

    expect(await screen.findByText('未着手')).toBeInTheDocument();
    expect(screen.getByText('作業中')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
    expect(screen.getByText('資料作成')).toBeInTheDocument();
    expect(screen.getByText('実装')).toBeInTheDocument();
    // 件数：未着手 1、作業中 1、完了 0
    expect(screen.getAllByText('1件')).toHaveLength(2);
    expect(screen.getByText('0件')).toBeInTheDocument();
  });

  it('サーバーに接続できないときはその旨を表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    render(<Board />);

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーに接続できません');
  });

  it('サーバーが 500 を返したときはその旨を表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ title: 'Internal Server Error', status: 500, detail: 'boom' }, 500),
        ),
      ),
    );

    render(<Board />);

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーでエラーが発生しました');
  });

  it('カードを登録すると POST のあとにそのリストを取り直し、新しい並びで表示する', async () => {
    const created: Card = {
      id: 3,
      title: '買い物',
      description: null,
      dueDate: null,
      priority: 'high',
      listId: 'todo',
      displayOrder: 1,
      createdAt: '2026-09-21T01:00:00Z',
      updatedAt: '2026-09-21T01:00:00Z',
    };
    // 登録後に取り直した todo の並び（サーバーが優先度順に並べ直した結果）
    const todoAfter: Card[] = [cards[0], created];

    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (path === '/api/cards' && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(created, 201));
      }
      if (path === '/api/cards?listId=todo') return Promise.resolve(jsonResponse(todoAfter));
      return Promise.resolve(jsonResponse(cards));
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Board />);
    const todoColumn = (await screen.findByText('未着手')).closest('section')!;

    await user.click(within(todoColumn).getByRole('button', { name: '＋ カードを追加' }));
    await user.type(within(todoColumn).getByRole('textbox'), '買い物');
    await user.click(within(todoColumn).getByRole('radio', { name: '高' }));
    await user.click(within(todoColumn).getByRole('button', { name: '追加' }));

    // 新しいカードが表示され、未着手の件数が 2 件になる
    expect(await within(todoColumn).findByText('買い物')).toBeInTheDocument();
    expect(within(todoColumn).getByText('2件')).toBeInTheDocument();
    // 他のリストは変わらない
    expect(screen.getByText('実装')).toBeInTheDocument();

    // POST の body は入力どおり
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall![1]!.body as string)).toEqual({
      title: '買い物',
      priority: 'high',
      listId: 'todo',
    });
  });

  it('登録に失敗してもボードは表示したままで、その列に文言を出す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string, init?: RequestInit) => {
        if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
        if (init?.method === 'POST') {
          return Promise.resolve(
            jsonResponse({ title: 'Bad Request', status: 400, detail: 'タイトルは必須です' }, 400),
          );
        }
        return Promise.resolve(jsonResponse(cards));
      }),
    );

    const user = userEvent.setup();
    render(<Board />);
    const todoColumn = (await screen.findByText('未着手')).closest('section')!;

    await user.click(within(todoColumn).getByRole('button', { name: '＋ カードを追加' }));
    await user.type(within(todoColumn).getByRole('textbox'), 'x');
    await user.click(within(todoColumn).getByRole('button', { name: '追加' }));

    expect(await within(todoColumn).findByRole('alert')).toHaveTextContent('タイトルは必須です');
    // ボードは消えていない
    expect(screen.getByText('作業中')).toBeInTheDocument();
    expect(screen.getByText('資料作成')).toBeInTheDocument();
  });

  it('カードをクリックすると詳細が開き、優先度を変えると PUT のあとにそのリストを取り直す', async () => {
    // 資料作成（high）を low に変えると、サーバーが並べ直した結果として末尾に移る想定
    const updated: Card = {
      ...cards[0]!,
      priority: 'low',
      displayOrder: 1,
      updatedAt: '2026-09-21T02:00:00Z',
    };
    const other: Card = {
      ...cards[0]!,
      id: 9,
      title: '別のカード',
      priority: 'medium',
      displayOrder: 0,
    };
    const todoAfter: Card[] = [other, updated];

    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (path === '/api/cards/1' && init?.method === 'PUT')
        return Promise.resolve(jsonResponse(updated));
      if (path === '/api/cards?listId=todo') return Promise.resolve(jsonResponse(todoAfter));
      return Promise.resolve(jsonResponse(cards));
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Board />);
    await user.click(await screen.findByRole('button', { name: /資料作成/ }));

    const dialog = screen.getByRole('dialog', { name: 'カード詳細' });
    expect(within(dialog).getByRole('textbox', { name: 'タイトル' })).toHaveValue('資料作成');

    await user.click(within(dialog).getByRole('radio', { name: '低' }));

    // 取り直した結果がボードに反映される（別のカードが現れ、件数が 2 件になる）
    const todoColumn = screen.getByText('未着手').closest('section')!;
    expect(await within(todoColumn).findByText('別のカード')).toBeInTheDocument();
    expect(within(todoColumn).getByText('2件')).toBeInTheDocument();

    // PUT の body は 4 項目
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(putCall![1]!.body as string)).toEqual({
      title: '資料作成',
      description: null,
      dueDate: null,
      priority: 'low',
    });

    // 閉じるとボードだけになる
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('作業中')).toBeInTheDocument();
  });

  it('カード詳細で「カードを削除」を押すと DELETE のあとにそのリストを取り直し、詳細が閉じる', async () => {
    let deleted = false;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (path === '/api/cards/1' && init?.method === 'DELETE') {
        deleted = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      // 削除後に todo を取り直すと空になる
      if (path === '/api/cards?listId=todo')
        return Promise.resolve(jsonResponse(deleted ? [] : [cards[0]]));
      return Promise.resolve(jsonResponse(cards));
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Board />);
    await user.click(await screen.findByRole('button', { name: /資料作成/ }));
    const dialog = screen.getByRole('dialog', { name: 'カード詳細' });

    await user.click(within(dialog).getByRole('button', { name: 'カードを削除' }));

    // 詳細が閉じ、カードが消えて未着手が 0 件になる。他のリストは変わらない
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('資料作成')).not.toBeInTheDocument();
    const todoColumn = screen.getByText('未着手').closest('section')!;
    expect(within(todoColumn).getByText('0件')).toBeInTheDocument();
    expect(screen.getByText('実装')).toBeInTheDocument();

    // DELETE は body なし。そのあと todo だけを取り直している（全件の取り直しは起動時の 1 回だけ）
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(deleteCall![0]).toBe('/api/cards/1');
    expect(deleteCall![1]!.body).toBeUndefined();
    expect(fetchMock.mock.calls.filter(([p]) => p === '/api/cards?listId=todo')).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([p]) => p === '/api/cards')).toHaveLength(1);
  });

  it('「優先度順に並べ替え」を押すと POST /api/cards/sort のあとに全件を取り直して表示する', async () => {
    // 並べ替え後の全件（サーバーが並べ直した結果。todo に low → high の順で 2 枚あった想定）
    const sorted: Card[] = [
      { ...cards[0]!, id: 11, title: '高いタスク', priority: 'high', displayOrder: 0 },
      { ...cards[0]!, id: 10, title: '低いタスク', priority: 'low', displayOrder: 1 },
      cards[1]!,
    ];
    const before: Card[] = [sorted[1]!, sorted[0]!, cards[1]!];

    let sortCalled = false;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (path === '/api/cards/sort' && init?.method === 'POST') {
        sortCalled = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      // 並べ替え前は before、並べ替え後は sorted を返す
      return Promise.resolve(jsonResponse(sortCalled ? sorted : before));
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<Board />);
    const todoColumn = (await screen.findByText('未着手')).closest('section')!;
    // 押す前は 低 → 高 の順
    const titlesBefore = within(todoColumn)
      .getAllByRole('button', { name: /タスク/ })
      .map((el) => el.textContent);
    expect(titlesBefore[0]).toContain('低いタスク');

    await user.click(screen.getByRole('button', { name: '優先度順に並べ替え' }));

    await waitFor(() => {
      const titles = within(todoColumn)
        .getAllByRole('button', { name: /タスク/ })
        .map((el) => el.textContent);
      expect(titles[0]).toContain('高いタスク');
      expect(titles[1]).toContain('低いタスク');
    });
    // POST は body なし、その後に全件（?listId= 無し）を取り直している
    const sortCall = fetchMock.mock.calls.find(([p]) => p === '/api/cards/sort');
    expect(sortCall![1]!.body).toBeUndefined();
    expect(fetchMock.mock.calls.filter(([p]) => p === '/api/cards')).toHaveLength(2);
  });

  it('並べ替えに失敗するとボード上部に文言を出し、ボードは表示したまま', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string, init?: RequestInit) => {
        if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
        if (init?.method === 'POST') {
          return Promise.resolve(
            jsonResponse({ title: 'Internal Server Error', status: 500, detail: 'boom' }, 500),
          );
        }
        return Promise.resolve(jsonResponse(cards));
      }),
    );

    const user = userEvent.setup();
    render(<Board />);
    await screen.findByText('未着手');

    await user.click(screen.getByRole('button', { name: '優先度順に並べ替え' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      '並べ替えを保存できませんでした。サーバーでエラーが発生しました。',
    );
    expect(screen.getByText('資料作成')).toBeInTheDocument();

    // 「閉じる」で消える
    await user.click(within(alert).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('上部の失敗文言は、次の登録が成功したときにも消える', async () => {
    // 並べ替えは 500 で失敗、登録は 201 で成功する
    const created: Card = { ...cards[0]!, id: 3, title: '買い物', priority: 'medium' };
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string, init?: RequestInit) => {
        if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
        if (path === '/api/cards/sort') {
          return Promise.resolve(
            jsonResponse({ title: 'Internal Server Error', status: 500, detail: 'boom' }, 500),
          );
        }
        if (path === '/api/cards' && init?.method === 'POST') {
          return Promise.resolve(jsonResponse(created, 201));
        }
        if (path === '/api/cards?listId=todo') {
          return Promise.resolve(jsonResponse([cards[0], created]));
        }
        return Promise.resolve(jsonResponse(cards));
      }),
    );

    const user = userEvent.setup();
    render(<Board />);
    const todoColumn = (await screen.findByText('未着手')).closest('section')!;

    await user.click(screen.getByRole('button', { name: '優先度順に並べ替え' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('並べ替えを保存できませんでした');

    await user.click(within(todoColumn).getByRole('button', { name: '＋ カードを追加' }));
    await user.type(within(todoColumn).getByRole('textbox'), '買い物');
    await user.click(within(todoColumn).getByRole('button', { name: '追加' }));

    // 登録が成功して反映されると、上部の文言は消えている（フロントエンド設計書 8.7）
    expect(await within(todoColumn).findByText('買い物')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
