import { apiGet } from './client';
import type { Card } from '../types/board';

/** GET /api/cards — 全カードを listId, displayOrder の昇順で取得する（API 設計書 6.） */
export function getCards(): Promise<Card[]> {
  return apiGet<Card[]>('/api/cards');
}
