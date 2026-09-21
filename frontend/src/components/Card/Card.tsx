import type { KeyboardEvent } from 'react';
import type { Card as CardData } from '../../types/board';
import { formatDue, isOverdue } from '../../utils/date';
import { PriorityBadge } from '../PriorityBadge/PriorityBadge';
import styles from './Card.module.css';

interface Props {
  card: CardData;
  /** カードをクリック（または Enter）したとき。カード詳細を開く */
  onClick: () => void;
}

/**
 * カード 1 枚。優先度バッジ、タイトル、期限の行を表示する（SC-01、FR-07、FR-08）。
 * クリックでカード詳細（SC-02）を開く。ボタンではなく div なので、キーボードでも開けるよう role と tabIndex を付ける。
 */
export function Card({ card, onClick }: Props) {
  const overdue = isOverdue(card);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.titleRow}>
        <PriorityBadge priority={card.priority} />
        <span className={styles.title}>{card.title}</span>
      </div>
      {/* 期限が無くても行を出し、カードの高さを揃える（フロントエンド設計書 8.2） */}
      <div className={overdue ? `${styles.due} ${styles.overdue}` : styles.due}>
        {card.dueDate !== null && `期限 ${formatDue(card.dueDate)}${overdue ? '（期限切れ）' : ''}`}
      </div>
    </div>
  );
}
