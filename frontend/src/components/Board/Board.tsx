import { useBoard } from '../../hooks/useBoard';
import { errorMessage } from '../../utils/errorMessage';
import { BoardList } from '../BoardList/BoardList';
import styles from './Board.module.css';

/** ボード。リストとカードを取得し、状態に応じて読み込み中・エラー・3 列のいずれかを描画する（SC-01） */
export function Board() {
  const { lists, cards, loading, error, addCard } = useBoard();

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

  return (
    <main className={styles.board}>
      {lists.map((list) => (
        <BoardList
          key={list.id}
          list={list}
          cards={cards.filter((c) => c.listId === list.id)}
          onAddCard={addCard}
        />
      ))}
    </main>
  );
}
