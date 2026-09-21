import { useState } from 'react';
import styles from './BoardToolbar.module.css';

interface Props {
  /** 「優先度順に並べ替え」を押したとき。useBoard の sortByPriority を渡す。失敗は呼び出し元へ投げてよい */
  onSort: () => Promise<void>;
}

/**
 * ヘッダーとボードの間のツールバー（画面要件書 5.1、フロントエンド設計書 8.8）。
 * 全リスト共通の操作を置く場所で、本版は「優先度順に並べ替え」ボタンだけを持つ（FR-10）。
 * 押している間はボタンを無効にして二重送信を防ぐ。成否の通知は Board に任せる。
 */
export function BoardToolbar({ onSort }: Props) {
  const [running, setRunning] = useState(false);

  async function handleClick() {
    setRunning(true);
    try {
      await onSort();
    } catch {
      // 失敗の通知は Board が行う（onSort の中で受け止めている）。ここではボタンを戻すだけ
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.sort} onClick={handleClick} disabled={running}>
        {running ? '並べ替え中…' : '優先度順に並べ替え'}
      </button>
    </div>
  );
}
