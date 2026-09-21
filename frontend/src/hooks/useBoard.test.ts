import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { BoardList, Card } from '../types/board';
import { useBoard } from './useBoard';

// ドラッグ操作そのものは jsdom で再現しにくいため、ドロップ後の処理（moveCard）をフック単体で確かめる
// （フロントエンド設計書 11. 保留事項）。

const lists: BoardList[] = [
  { id: 'todo', name: '未着手', displayOrder: 0 },
  { id: 'doing', name: '作業中', displayOrder: 1 },
  { id: 'done', name: '完了', displayOrder: 2 },
];

function card(id: number, listId: Card['listId'], displayOrder: number): Card {
  return {
    id,
    title: `card${id}`,
    description: null,
    dueDate: null,
    priority: 'medium',
    listId,
    displayOrder,
    createdAt: '2026-09-20T01:00:00Z',
    updatedAt: '2026-09-20T01:00:00Z',
  };
}

const initial: Card[] = [card(1, 'todo', 0), card(2, 'todo', 1), card(3, 'doing', 0)];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const idsIn = (cards: Card[], listId: Card['listId']) =>
  cards.filter((c) => c.listId === listId).map((c) => c.id);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useBoard.moveCard', () => {
  it('ドロップ直後に手元の並びを変え、成功したら移動元・移動先を取り直す', async () => {
    // 1 を doing の先頭へ。サーバーが振り直した結果は todo: [2] / doing: [1, 3]
    const todoAfter = [card(2, 'todo', 0)];
    const doingAfter = [card(1, 'doing', 0), card(3, 'doing', 1)];
    let resolvePut: (r: Response) => void = () => {};
    const putPromise = new Promise<Response>((resolve) => {
      resolvePut = resolve;
    });

    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (path === '/api/cards/1/position' && init?.method === 'PUT') return putPromise;
      if (path === '/api/cards?listId=todo') return Promise.resolve(jsonResponse(todoAfter));
      if (path === '/api/cards?listId=doing') return Promise.resolve(jsonResponse(doingAfter));
      return Promise.resolve(jsonResponse(initial));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.moveCard(1, { listId: 'doing', displayOrder: 0 });
    });

    // API の応答を待たずに並びが変わっている（楽観更新）
    expect(idsIn(result.current.cards, 'todo')).toEqual([2]);
    expect(idsIn(result.current.cards, 'doing')).toEqual([1, 3]);

    await act(async () => {
      resolvePut(jsonResponse(card(1, 'doing', 0)));
      await pending;
    });

    // PUT の body と、移動元・移動先の取り直し
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(putCall![1]!.body as string)).toEqual({ listId: 'doing', displayOrder: 0 });
    const paths = fetchMock.mock.calls.map(([p]) => p);
    expect(paths).toContain('/api/cards?listId=todo');
    expect(paths).toContain('/api/cards?listId=doing');
    expect(idsIn(result.current.cards, 'todo')).toEqual([2]);
    expect(idsIn(result.current.cards, 'doing')).toEqual([1, 3]);
  });

  it('失敗したら全件を取り直して元に戻し、ApiError を投げる', async () => {
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/lists') return Promise.resolve(jsonResponse(lists));
      if (init?.method === 'PUT') {
        return Promise.resolve(
          jsonResponse({ title: 'Internal Server Error', status: 500, detail: 'boom' }, 500),
        );
      }
      return Promise.resolve(jsonResponse(initial)); // GET /api/cards（全件）
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current.moveCard(1, { listId: 'doing', displayOrder: 0 });
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(500);
    // サーバーの状態（元の位置）に戻っている
    expect(idsIn(result.current.cards, 'todo')).toEqual([1, 2]);
    expect(idsIn(result.current.cards, 'doing')).toEqual([3]);
    // 取り直しは全件（?listId= 付きではない）
    expect(fetchMock.mock.calls.filter(([p]) => p === '/api/cards')).toHaveLength(2);
  });
});
