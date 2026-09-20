import type { ApiError } from '../../api/client';
import { useBoard } from '../../hooks/useBoard';
import { BoardList } from '../BoardList/BoardList';
import styles from './Board.module.css';

/** エラーの種類に応じた表示文言（フロントエンド設計書 6.3） */
function errorMessage(error: ApiError): string {
  if (error.status === null) {
    return 'サーバーに接続できません。バックエンドが起動しているか確認してください。';
  }
  if (error.status === 500) {
    return 'サーバーでエラーが発生しました。';
  }
  return error.message;
}

/** ボード。リストとカードを取得し、状態に応じて読み込み中・エラー・3 列のいずれかを描画する（SC-01） */
export function Board() {
  const { lists, cards, loading, error } = useBoard();

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
        <BoardList key={list.id} list={list} cards={cards.filter((c) => c.listId === list.id)} />
      ))}
    </main>
  );
}
