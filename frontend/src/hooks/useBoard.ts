import { useEffect, useState } from 'react';
import { getCards } from '../api/cards';
import { ApiError } from '../api/client';
import { getLists } from '../api/lists';
import type { BoardList, Card } from '../types/board';

export interface BoardState {
  lists: BoardList[];
  cards: Card[];
  loading: boolean;
  error: ApiError | null;
}

/**
 * ボードの表示に必要なリストとカードを取得して保持する（フロントエンド設計書 5.）。
 * 描画時に 1 回だけ、/api/lists と /api/cards を同時に要求する。
 */
export function useBoard(): BoardState {
  const [lists, setLists] = useState<BoardList[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    // コンポーネントが消えた後に応答が返っても状態を更新しないためのフラグ。
    // React の開発モードでは useEffect が 2 回実行されるため、これが無いと二重更新になる。
    let cancelled = false;

    Promise.all([getLists(), getCards()])
      .then(([fetchedLists, fetchedCards]) => {
        if (cancelled) return;
        setLists(fetchedLists);
        setCards(fetchedCards);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e : new ApiError(null, String(e)));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { lists, cards, loading, error };
}
