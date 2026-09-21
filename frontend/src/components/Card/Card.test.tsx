import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

/** Card は Draggable なので、DragDropContext と Droppable の中でしか描画できない */
function renderInBoard(ui: ReactNode) {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="todo">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {ui}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>,
  );
}

/** 今日から offsetDays 日後の 'YYYY-MM-DD' */
function dateFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return todayString(d);
}

describe('Card', () => {
  it('タイトルと優先度の表示名を表示する', () => {
    renderInBoard(
      <Card index={0} onClick={() => {}} card={makeCard({ title: '買い物', priority: 'high' })} />,
    );
    expect(screen.getByText('買い物')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
  });

  it('期限があれば「期限 MM/DD」を表示する', () => {
    renderInBoard(<Card index={0} onClick={() => {}} card={makeCard({ dueDate: '2099-09-22' })} />);
    expect(screen.getByText('期限 09/22')).toBeInTheDocument();
  });

  it('期限が無ければ期限の文言を表示しない', () => {
    renderInBoard(<Card index={0} onClick={() => {}} card={makeCard({ dueDate: null })} />);
    expect(screen.queryByText(/期限/)).not.toBeInTheDocument();
  });

  it('期限を過ぎていれば「（期限切れ）」を付けて強調する', () => {
    renderInBoard(
      <Card
        index={0}
        onClick={() => {}}
        card={makeCard({ dueDate: dateFromToday(-1), listId: 'todo' })}
      />,
    );
    const due = screen.getByText(/期限切れ/);
    expect(due).toBeInTheDocument();
    expect(due.className).toContain('overdue');
  });

  it('完了リストのカードは期限を過ぎていても「（期限切れ）」を付けない', () => {
    renderInBoard(
      <Card
        index={0}
        onClick={() => {}}
        card={makeCard({ dueDate: dateFromToday(-1), listId: 'done' })}
      />,
    );
    expect(screen.queryByText(/期限切れ/)).not.toBeInTheDocument();
  });

  it('クリックと Enter で onClick が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInBoard(<Card index={0} onClick={onClick} card={makeCard()} />);

    const card = screen.getByRole('button', { name: /資料作成/ });
    await user.click(card);
    card.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
