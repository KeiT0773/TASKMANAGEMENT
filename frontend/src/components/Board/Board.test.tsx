import { render, screen, within } from '@testing-library/react';
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
});
