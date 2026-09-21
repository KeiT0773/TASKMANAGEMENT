import { apiGet, apiPost } from './client';
import type { Card, CardCreateInput, ListId } from '../types/board';

/**
 * GET /api/cards — カードを listId, displayOrder の昇順で取得する（API 設計書 6.）。
 * listId を指定すると、そのリストのカードだけを取得する。
 */
export function getCards(listId?: ListId): Promise<Card[]> {
  const path = listId === undefined ? '/api/cards' : `/api/cards?listId=${listId}`;
  return apiGet<Card[]>(path);
}

/**
 * POST /api/cards — カードを登録し、登録したカードを返す（API 設計書 8.）。
 * 登録後はサーバーがそのリスト内を優先度順に並べ直すため、
 * 他のカードの displayOrder も変わりうる。呼び出し側は getCards(listId) で取り直すこと。
 */
export function createCard(input: CardCreateInput): Promise<Card> {
  return apiPost<CardCreateInput, Card>('/api/cards', input);
}
