import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Card as CardData } from '../../types/board';
import { todayString } from '../../utils/date';
import { Card } from './Card';

/** テスト用のカード。指定しなかった項目は既定値にする */
function makeCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: 1,
    title: '資料作成',
    description: null,
    dueDate: null,
    priority: 'medium',
    listId: 'todo',
    displayOrder: 0,
    createdAt: '2026-09-20T01:00:00Z',
    updatedAt: '2026-09-20T01:00:00Z',
    ...overrides,
  };
}

/** 今日から offsetDays 日後の 'YYYY-MM-DD' */
function dateFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return todayString(d);
}

describe('Card', () => {
  it('タイトルと優先度の表示名を表示する', () => {
    render(<Card card={makeCard({ title: '買い物', priority: 'high' })} />);
    expect(screen.getByText('買い物')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
  });

  it('期限があれば「期限 MM/DD」を表示する', () => {
    render(<Card card={makeCard({ dueDate: '2099-09-22' })} />);
    expect(screen.getByText('期限 09/22')).toBeInTheDocument();
  });

  it('期限が無ければ期限の文言を表示しない', () => {
    render(<Card card={makeCard({ dueDate: null })} />);
    expect(screen.queryByText(/期限/)).not.toBeInTheDocument();
  });

  it('期限を過ぎていれば「（期限切れ）」を付けて強調する', () => {
    render(<Card card={makeCard({ dueDate: dateFromToday(-1), listId: 'todo' })} />);
    const due = screen.getByText(/期限切れ/);
    expect(due).toBeInTheDocument();
    expect(due.className).toContain('overdue');
  });

  it('完了リストのカードは期限を過ぎていても「（期限切れ）」を付けない', () => {
    render(<Card card={makeCard({ dueDate: dateFromToday(-1), listId: 'done' })} />);
    expect(screen.queryByText(/期限切れ/)).not.toBeInTheDocument();
  });
});
