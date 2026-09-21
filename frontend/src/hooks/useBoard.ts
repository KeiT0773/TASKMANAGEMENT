import { useCallback, useEffect, useState } from 'react';
import { createCard, getCards, updateCard as updateCardApi } from '../api/cards';
import { ApiError } from '../api/client';
import { getLists } from '../api/lists';
import type { BoardList, Card, CardCreateInput, CardUpdateInput, ListId } from '../types/board';

export interface BoardState {
  lists: BoardList[];
  cards: Card[];
  loading: boolean;
  error: ApiError | null;
  /** カードを登録する（フロントエンド設計書 5.3）。失敗したときは ApiError を投げる */
  addCard: (input: CardCreateInput) => Promise<void>;
  /** カードの 4 項目を編集する（フロントエンド設計書 5.4）。失敗したときは ApiError を投げる */
  updateCard: (id: number, input: CardUpdateInput) => Promise<void>;
}

/**
 * ボードの表示に必要なリストとカードを取得して保持し、カードの登録・編集も受け持つ（フロントエンド設計書 5.）。
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

  /**
   * 1 つのリストのカードを取り直し、cards のうちそのリストの分だけを置き換える。
   * 直前の状態を引数に取る形にし、他の操作で変わった内容を上書きしないようにする。
   */
  const reloadList = useCallback(async (listId: ListId): Promise<void> => {
    const fetched = await getCards(listId);
    setCards((prev) => [...prev.filter((c) => c.listId !== listId), ...fetched]);
  }, []);

  /**
   * POST で登録したあと、そのリストのカードを取り直して置き換える。
   * 登録後はサーバーがリスト内を優先度順に並べ直し、他のカードの displayOrder も変わりうるため、
   * 応答の 1 件を差し込むのではなく取り直す（フロントエンド設計書 2. 方針 8）。
   * 失敗は呼び出し元（AddCardForm）に投げ、ボード全体の error には入れない（方針 7）。
   */
  const addCard = useCallback(
    async (input: CardCreateInput): Promise<void> => {
      await createCard(input);
      await reloadList(input.listId);
    },
    [reloadList],
  );

  /**
   * PUT で編集したあと、そのカードのリストを取り直して置き換える。
   * 優先度を変えたときはサーバーがリスト内を並べ直すため、他の項目の編集と分岐を分けず常に取り直す（方針 8）。
   * 応答のカードの listId を使う（編集では listId は変わらない）。
   */
  const updateCard = useCallback(
    async (id: number, input: CardUpdateInput): Promise<void> => {
      const updated = await updateCardApi(id, input);
      await reloadList(updated.listId);
    },
    [reloadList],
  );

  return { lists, cards, loading, error, addCard, updateCard };
}
