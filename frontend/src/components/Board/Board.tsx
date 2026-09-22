import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useCallback, useState } from 'react';
import { ApiError } from '../../api/client';
import { useBoard } from '../../hooks/useBoard';
import type { CardCreateInput, CardUpdateInput } from '../../types/board';
import { dragEndToMove } from '../../utils/board';
import { errorMessage } from '../../utils/errorMessage';
import { BoardList } from '../BoardList/BoardList';
import { BoardToolbar } from '../BoardToolbar/BoardToolbar';
import { CardDetail } from '../CardDetail/CardDetail';
import styles from './Board.module.css';

/**
 * ボード。リストとカードを取得し、状態に応じて読み込み中・エラー・3 列のいずれかを描画する（SC-01）。
 * 3 列を DragDropContext で包み、ドロップ時に移動を保存する（FR-04、FR-05）。
 * 上部にツールバー（全リストの優先度順並べ替え、FR-10）を置き、
 * 選択中のカードがあれば、その手前にカード詳細（SC-02）を重ねる。カード詳細からの削除（FR-03）もここで受ける。
 */
export function Board() {
  const {
    lists,
    cards,
    loading,
    error,
    addCard,
    updateCard,
    moveCard,
    sortByPriority,
    deleteCard,
  } = useBoard();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  // 移動・一括並べ替えに失敗したときの文言（方針 7）。入力欄が無い操作なので、ボードの上部に出す。
  // action は「移動」「並べ替え」のように、どの操作が失敗したかを示す
  const [actionError, setActionError] = useState<{ action: string; error: ApiError } | null>(null);
  const closeDetail = useCallback(() => setSelectedCardId(null), []);

  /** 移動・並べ替えなど、ボード全体に対する操作を実行し、成否を actionError に反映する */
  const runAction = useCallback(async (action: string, run: () => Promise<void>) => {
    try {
      await run();
      setActionError(null);
    } catch (e: unknown) {
      setActionError({ action, error: e instanceof ApiError ? e : new ApiError(null, String(e)) });
    }
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const move = dragEndToMove(result);
      if (move === null) return;
      void runAction('移動', () =>
        moveCard(move.cardId, { listId: move.listId, displayOrder: move.displayOrder }),
      );
    },
    [moveCard, runAction],
  );

  const handleSort = useCallback(
    () => runAction('並べ替え', sortByPriority),
    [runAction, sortByPriority],
  );

  // 登録・編集・削除は失敗をそれぞれの入力欄（AddCardForm / CardDetail）で伝えるので、
  // ここでは受け止めずに投げ直す。ただし成功したときは上部の文言を消す
  // （フロントエンド設計書 8.7「次の移動・編集・登録が成功したときにも消す」）。
  const handleAddCard = useCallback(
    async (input: CardCreateInput) => {
      await addCard(input);
      setActionError(null);
    },
    [addCard],
  );

  const handleUpdateCard = useCallback(
    async (id: number, input: CardUpdateInput) => {
      await updateCard(id, input);
      setActionError(null);
    },
    [updateCard],
  );

  const handleDeleteCard = useCallback(
    async (id: number) => {
      await deleteCard(id);
      setActionError(null);
    },
    [deleteCard],
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

  // 選択中のカードは cards から探す。無くなっていれば（削除後）詳細は描画しない
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  return (
    <>
      <BoardToolbar onSort={handleSort} />
      {actionError !== null && (
        <div className={styles.notice} role="alert">
          <span>
            {actionError.action}を保存できませんでした。{errorMessage(actionError.error)}
          </span>
          <button type="button" className={styles.noticeClose} onClick={() => setActionError(null)}>
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
              onAddCard={handleAddCard}
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
          onSave={(input) => handleUpdateCard(selectedCard.id, input)}
          onDelete={async () => {
            await handleDeleteCard(selectedCard.id);
            // cards から消えるので描画されなくなるが、古い id を持ち続けないよう明示的に閉じる
            closeDetail();
          }}
          onClose={closeDetail}
        />
      )}
    </>
  );
}
