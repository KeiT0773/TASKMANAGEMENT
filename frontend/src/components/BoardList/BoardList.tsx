import type {
  BoardList as BoardListData,
  Card as CardData,
  CardCreateInput,
} from '../../types/board';
import { AddCardForm } from '../AddCardForm/AddCardForm';
import { Card } from '../Card/Card';
import styles from './BoardList.module.css';

interface Props {
  list: BoardListData;
  /** このリストに属するカード。API から返った順（displayOrder 昇順）のまま渡す */
  cards: CardData[];
  /** 「＋ カードを追加」からの登録。useBoard の addCard を渡す */
  onAddCard: (input: CardCreateInput) => Promise<void>;
  /** カードをクリックしたとき。カード詳細を開く */
  onCardClick: (id: number) => void;
}

/**
 * 1 つのリスト（列）。見出しと件数、カードの一覧、最下部に追加フォームを縦に並べる（SC-01）。
 * 追加フォームはスクロールする領域（.cards）の外に置き、カードが多くても常に見えるようにする。
 */
export function BoardList({ list, cards, onAddCard, onCardClick }: Props) {
  return (
    <section className={styles.list}>
      <div className={styles.header}>
        <span>{list.name}</span>
        <span className={styles.count}>{cards.length}件</span>
      </div>
      <div className={styles.cards}>
        {cards.map((card) => (
          <Card key={card.id} card={card} onClick={() => onCardClick(card.id)} />
        ))}
      </div>
      <AddCardForm listId={list.id} onSubmit={onAddCard} />
    </section>
  );
}
