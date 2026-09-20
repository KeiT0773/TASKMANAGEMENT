import { render, screen } from '@testing-library/react';
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
});
