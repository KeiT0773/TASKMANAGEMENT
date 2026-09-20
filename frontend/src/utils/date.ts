// 日付の書式変換と期限超過の判定（フロントエンド設計書 8.2, 8.3）。
// 日付は API から受け取った 'YYYY-MM-DD' の文字列のまま扱い、Date 型には変換しない。

import type { Card } from '../types/board';

/** 端末のローカル日付を 'YYYY-MM-DD' で返す */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' を画面表示用の 'MM/DD' にする */
export function formatDue(dueDate: string): string {
  const [, m, d] = dueDate.split('-');
  return `${m}/${d}`;
}

/**
 * 期限超過かどうか。
 * 期限があり、今日より前で、かつ「完了」以外のリストにあるカードを期限超過とする。
 * 期限当日は超過とみなさない（データ設計書 5.4）。
 * 'YYYY-MM-DD' 形式は文字列の大小と日付の前後が一致するため、文字列のまま比較する。
 */
export function isOverdue(
  card: Pick<Card, 'dueDate' | 'listId'>,
  today: string = todayString(),
): boolean {
  return card.dueDate !== null && card.dueDate < today && card.listId !== 'done';
}
