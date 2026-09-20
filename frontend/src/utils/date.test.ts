import { describe, expect, it } from 'vitest';
import { formatDue, isOverdue, todayString } from './date';

describe('todayString', () => {
  it('ローカル日付を YYYY-MM-DD で返す（月日は 0 埋め）', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('formatDue', () => {
  it('YYYY-MM-DD を MM/DD にする', () => {
    expect(formatDue('2026-09-22')).toBe('09/22');
  });
});

describe('isOverdue', () => {
  const today = '2026-09-20';

  it('期限が無ければ超過ではない', () => {
    expect(isOverdue({ dueDate: null, listId: 'todo' }, today)).toBe(false);
  });

  it('期限が今日より前で、完了以外のリストにあれば超過', () => {
    expect(isOverdue({ dueDate: '2026-09-19', listId: 'todo' }, today)).toBe(true);
    expect(isOverdue({ dueDate: '2026-09-19', listId: 'doing' }, today)).toBe(true);
  });

  it('期限が今日なら超過ではない（当日は含めない）', () => {
    expect(isOverdue({ dueDate: '2026-09-20', listId: 'todo' }, today)).toBe(false);
  });

  it('期限が未来なら超過ではない', () => {
    expect(isOverdue({ dueDate: '2026-09-21', listId: 'todo' }, today)).toBe(false);
  });

  it('完了リストのカードは、期限が過ぎていても超過扱いにしない', () => {
    expect(isOverdue({ dueDate: '2026-09-01', listId: 'done' }, today)).toBe(false);
  });
});
