import { Draggable } from '@hello-pangea/dnd';
import type { KeyboardEvent } from 'react';
import type { Card as CardData } from '../../types/board';
import { formatDue, isOverdue } from '../../utils/date';
import { PriorityBadge } from '../PriorityBadge/PriorityBadge';
import styles from './Card.module.css';

interface Props {
  card: CardData;
  /** 列内での順番（0 始まり）。Draggable に渡す */
  index: number;
  /** カードをクリック（または Enter）したとき。カード詳細を開く */
  onClick: () => void;
}

/**
 * カード 1 枚。優先度バッジ、タイトル、期限の行を表示する（SC-01、FR-07、FR-08）。
 * つかんで動かせ（Draggable、FR-04・FR-05）、クリックでカード詳細（SC-02）を開く。
 * クリックとドラッグの区別はライブラリが行う（数ピクセル動かすまではクリック）。
 * Enter で開けるよう onKeyDown を持つ（ライブラリのキーボード操作は Space で持ち上げる）。
 */
export function Card({ card, index, onClick }: Props) {
  const overdue = isOverdue(card);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={snapshot.isDragging ? `${styles.card} ${styles.dragging}` : styles.card}
          onClick={onClick}
          onKeyDown={handleKeyDown}
        >
          <div className={styles.titleRow}>
            <PriorityBadge priority={card.priority} />
            <span className={styles.title}>{card.title}</span>
          </div>
          {/* 期限が無くても行を出し、カードの高さを揃える（フロントエンド設計書 8.2） */}
          <div className={overdue ? `${styles.due} ${styles.overdue}` : styles.due}>
            {card.dueDate !== null &&
              `期限 ${formatDue(card.dueDate)}${overdue ? '（期限切れ）' : ''}`}
          </div>
        </div>
      )}
    </Draggable>
  );
}
