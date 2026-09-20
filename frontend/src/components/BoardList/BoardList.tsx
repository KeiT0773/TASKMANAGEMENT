import type { BoardList as BoardListData, Card as CardData } from '../../types/board';
import { Card } from '../Card/Card';
import styles from './BoardList.module.css';

interface Props {
  list: BoardListData;
  /** このリストに属するカード。API から返った順（displayOrder 昇順）のまま渡す */
  cards: CardData[];
}

/** 1 つのリスト（列）。見出しと件数、カードの一覧を縦に並べる（SC-01） */
export function BoardList({ list, cards }: Props) {
  return (
    <section className={styles.list}>
      <div className={styles.header}>
        <span>{list.name}</span>
        <span className={styles.count}>{cards.length}件</span>
      </div>
      <div className={styles.cards}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
