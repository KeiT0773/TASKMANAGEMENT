// API の要求・応答に対応する型。項目名・型・null 可否は API 設計書（docs/api-design.md）4. と
// 1 対 1 で対応させる（フロントエンド設計書 7.）。

/** 優先度の区分値（API 設計書 2. 方針 7） */
export type Priority = 'high' | 'medium' | 'low';

/** リストの識別子（API 設計書 2. 方針 7） */
export type ListId = 'todo' | 'doing' | 'done';

/** リスト（API 設計書 4.1） */
export interface BoardList {
  id: ListId;
  name: string;
  displayOrder: number;
}

/** カード（API 設計書 4.2） */
export interface Card {
  id: number;
  title: string;
  /** 未入力は null */
  description: string | null;
  /** YYYY-MM-DD。未設定は null */
  dueDate: string | null;
  priority: Priority;
  listId: ListId;
  displayOrder: number;
  /** ISO 8601（UTC、末尾 Z） */
  createdAt: string;
  /** ISO 8601（UTC、末尾 Z） */
  updatedAt: string;
}

/** カード登録の要求 body（API 設計書 8.）。description と dueDate は登録時には送らない */
export interface CardCreateInput {
  title: string;
  priority: Priority;
  listId: ListId;
}

/**
 * カード編集の要求 body（API 設計書 9.）。4 項目をまとめて送る。
 * description と dueDate は未設定を null で表す（'' は送らない）
 */
export interface CardUpdateInput {
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
}

/**
 * カード移動・並べ替えの要求 body（API 設計書 10.）。
 * displayOrder は移動先リストで「自分を除いた並びの何番目か」（0 始まり）。D&D ライブラリの destination.index と同じ
 */
export interface CardMoveInput {
  listId: ListId;
  displayOrder: number;
}
