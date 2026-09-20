import { apiGet } from './client';
import type { BoardList } from '../types/board';

/** GET /api/lists — リスト一覧を displayOrder の昇順で取得する（API 設計書 5.） */
export function getLists(): Promise<BoardList[]> {
  return apiGet<BoardList[]>('/api/lists');
}
