import type { DropResult } from '@hello-pangea/dnd';
import { describe, expect, it } from 'vitest';
import type { Card } from '../types/board';
import { applyMove, dragEndToMove } from './board';

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

// todo: 1, 2, 3 / doing: 4, 5 / done: 6
const cards: Card[] = [
  card(1, 'todo', 0),
  card(2, 'todo', 1),
  card(3, 'todo', 2),
  card(4, 'doing', 0),
  card(5, 'doing', 1),
  card(6, 'done', 0),
];

const idsIn = (list: Card[], listId: Card['listId']) =>
  list.filter((c) => c.listId === listId).map((c) => c.id);

describe('applyMove', () => {
  it('同じリスト内で下へ動かすと、自分を除いた並びのその位置に入る', () => {
    const result = applyMove(cards, 1, 'todo', 2);
    expect(idsIn(result, 'todo')).toEqual([2, 3, 1]);
  });

  it('同じリスト内で上へ動かす', () => {
    const result = applyMove(cards, 3, 'todo', 0);
    expect(idsIn(result, 'todo')).toEqual([3, 1, 2]);
  });

  it('別のリストへ動かすと listId が変わり、移動元から消えて移動先の指定位置に入る', () => {
    const result = applyMove(cards, 2, 'doing', 1);
    expect(idsIn(result, 'todo')).toEqual([1, 3]);
    expect(idsIn(result, 'doing')).toEqual([4, 2, 5]);
    expect(result.find((c) => c.id === 2)?.listId).toBe('doing');
  });

  it('位置が枚数以上なら末尾、負なら先頭に入る', () => {
    expect(idsIn(applyMove(cards, 1, 'done', 99), 'done')).toEqual([6, 1]);
    expect(idsIn(applyMove(cards, 1, 'done', -5), 'done')).toEqual([1, 6]);
  });

  it('他のリストのカードは触らず、元の配列も変更しない', () => {
    const before = JSON.stringify(cards);
    const result = applyMove(cards, 1, 'doing', 0);
    expect(idsIn(result, 'done')).toEqual([6]);
    expect(JSON.stringify(cards)).toBe(before);
  });

  it('存在しないカードなら元の配列をそのまま返す', () => {
    expect(applyMove(cards, 999, 'doing', 0)).toBe(cards);
  });
});

function dropResult(
  draggableId: string,
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number } | null,
): DropResult {
  return {
    draggableId,
    type: 'DEFAULT',
    source,
    destination,
    reason: 'DROP',
    mode: 'FLUID',
    combine: null,
  };
}

describe('dragEndToMove', () => {
  it('列の外で離した（destination が無い）ときは null', () => {
    expect(dragEndToMove(dropResult('1', { droppableId: 'todo', index: 0 }, null))).toBeNull();
  });

  it('元と同じ位置なら null', () => {
    expect(
      dragEndToMove(
        dropResult('1', { droppableId: 'todo', index: 0 }, { droppableId: 'todo', index: 0 }),
      ),
    ).toBeNull();
  });

  it('同じリスト内の別の位置なら、その位置を displayOrder にする', () => {
    expect(
      dragEndToMove(
        dropResult('1', { droppableId: 'todo', index: 0 }, { droppableId: 'todo', index: 2 }),
      ),
    ).toEqual({ cardId: 1, listId: 'todo', displayOrder: 2 });
  });

  it('別のリストなら、そのリストと位置を返す（同じ index でも移動になる）', () => {
    expect(
      dragEndToMove(
        dropResult('7', { droppableId: 'todo', index: 1 }, { droppableId: 'done', index: 1 }),
      ),
    ).toEqual({ cardId: 7, listId: 'done', displayOrder: 1 });
  });
});
