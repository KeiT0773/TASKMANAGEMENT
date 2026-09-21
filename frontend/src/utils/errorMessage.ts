import type { ApiError } from '../api/client';

/**
 * エラーの種類に応じた表示文言（フロントエンド設計書 6.3）。
 * ボード全体のエラー表示（Board）と登録失敗の表示（AddCardForm）の両方から使い、
 * 同じ種類のエラーは画面のどこで起きても同じ文言にする。
 */
export function errorMessage(error: ApiError): string {
  if (error.status === null) {
    return 'サーバーに接続できません。バックエンドが起動しているか確認してください。';
  }
  if (error.status === 500) {
    return 'サーバーでエラーが発生しました。';
  }
  return error.message;
}
