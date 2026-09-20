import type { Card as CardData } from '../../types/board';
import { formatDue, isOverdue } from '../../utils/date';
import { PriorityBadge } from '../PriorityBadge/PriorityBadge';
import styles from './Card.module.css';

interface Props {
  card: CardData;
}

/** カード 1 枚。優先度バッジ、タイトル、期限の行を表示する（SC-01、FR-07、FR-08） */
export function Card({ card }: Props) {
  const overdue = isOverdue(card);

  return (
    <div className={styles.card}>
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
