// API 呼び出しの共通処理（フロントエンド設計書 6.）。
// 個々の API（lists.ts, cards.ts）はここの apiGet / apiPost を呼ぶだけの薄い関数にする。

/** RFC 9457 Problem Details（API 設計書 2.1）。type は省略される */
interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

/**
 * API 呼び出しの失敗を表す例外。
 * status が null のときはサーバーに到達できなかった（停止中・ネットワーク未接続）。
 * 数値のときはサーバーがその HTTP ステータスで応答した。
 */
export class ApiError extends Error {
  readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * GET 要求を送り、応答の JSON を T として返す。
 * パスは '/api/cards' のように相対で指定する（開発時は Vite のプロキシがバックエンドへ転送する）。
 */
export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

/**
 * POST 要求を送り、応答の JSON を T として返す。
 * body は JSON に変換して送る。201 Created も 2xx なので成功として扱う。
 */
export function apiPost<TBody, T>(path: string, body: TBody): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** GET と POST に共通する、fetch の実行と応答の判定 */
async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    // fetch 自体が失敗するのは、サーバーに到達できなかったとき
    throw new ApiError(null, 'サーバーに接続できません');
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  return (await res.json()) as T;
}

/** エラー応答の本文（ProblemDetail）から表示用の文言を取り出す */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const problem = (await res.json()) as ProblemDetail;
    return problem.detail ?? problem.title ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
