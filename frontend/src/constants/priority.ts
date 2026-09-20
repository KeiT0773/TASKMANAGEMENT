import type { Priority } from '../types/board';

/** 優先度の区分値と表示名の対応（フロントエンド設計書 8.1）。画面モック mock/script.js と同じ */
export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
