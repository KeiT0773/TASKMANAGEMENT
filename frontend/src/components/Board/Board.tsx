import { useCallback, useState } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { errorMessage } from '../../utils/errorMessage';
import { BoardList } from '../BoardList/BoardList';
import { CardDetail } from '../CardDetail/CardDetail';
import styles from './Board.module.css';

/**
 * ボード。リストとカードを取得し、状態に応じて読み込み中・エラー・3 列のいずれかを描画する（SC-01）。
 * 選択中のカードがあれば、その手前にカード詳細（SC-02）を重ねる。
 */
export function Board() {
  const { lists, cards, loading, error, addCard, updateCard } = useBoard();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const closeDetail = useCallback(() => setSelectedCardId(null), []);

  if (loading) {
    return <p className={styles.message}>読み込み中…</p>;
  }

  if (error !== null) {
    return (
      <p className={styles.message} role="alert">
        {errorMessage(error)}
      </p>
    );
  }

  // 選択中のカードは cards から探す。無くなっていれば（将来の削除）詳細は描画しない
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  return (
    <>
      <main className={styles.board}>
        {lists.map((list) => (
          <BoardList
            key={list.id}
            list={list}
            cards={cards.filter((c) => c.listId === list.id)}
            onAddCard={addCard}
            onCardClick={setSelectedCardId}
          />
        ))}
      </main>
      {selectedCard !== null && (
        // key を付け、別のカードを開いたときは下書きを持ったコンポーネントを作り直す
        <CardDetail
          key={selectedCard.id}
          card={selectedCard}
          onSave={(input) => updateCard(selectedCard.id, input)}
          onClose={closeDetail}
        />
      )}
    </>
  );
}
