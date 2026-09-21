import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useCallback, useState } from 'react';
import { ApiError } from '../../api/client';
import { useBoard } from '../../hooks/useBoard';
import { dragEndToMove } from '../../utils/board';
import { errorMessage } from '../../utils/errorMessage';
import { BoardList } from '../BoardList/BoardList';
import { CardDetail } from '../CardDetail/CardDetail';
import styles from './Board.module.css';

/**
 * ボード。リストとカードを取得し、状態に応じて読み込み中・エラー・3 列のいずれかを描画する（SC-01）。
 * 3 列を DragDropContext で包み、ドロップ時に移動を保存する（FR-04、FR-05）。
 * 選択中のカードがあれば、その手前にカード詳細（SC-02）を重ねる。
 */
export function Board() {
  const { lists, cards, loading, error, addCard, updateCard, moveCard } = useBoard();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  // 移動に失敗したときの文言（方針 7）。移動には入力欄が無いので、ボードの上部に出す
  const [moveError, setMoveError] = useState<ApiError | null>(null);
  const closeDetail = useCallback(() => setSelectedCardId(null), []);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const move = dragEndToMove(result);
      if (move === null) return;
      try {
        await moveCard(move.cardId, { listId: move.listId, displayOrder: move.displayOrder });
        setMoveError(null);
      } catch (e: unknown) {
        setMoveError(e instanceof ApiError ? e : new ApiError(null, String(e)));
      }
    },
    [moveCard],
  );

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
      {moveError !== null && (
        <div className={styles.notice} role="alert">
          <span>移動を保存できませんでした。{errorMessage(moveError)}</span>
          <button type="button" className={styles.noticeClose} onClick={() => setMoveError(null)}>
            閉じる
          </button>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
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
      </DragDropContext>
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
