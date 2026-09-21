import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiPost } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiPost', () => {
  it('204 No Content のときは本文を読まずに解決する', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiPost<undefined, void>('/api/cards/sort', undefined)).resolves.toBeUndefined();
  });

  it('body が undefined のときは Content-Type も body も付けずに送る', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);

    await apiPost<undefined, void>('/api/cards/sort', undefined);

    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/cards/sort');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('body があるときは JSON と Content-Type を付けて送り、応答の JSON を返す', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 1 }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiPost<{ title: string }, { id: number }>('/api/cards', { title: 'x' });

    expect(result).toEqual({ id: 1 });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe('{"title":"x"}');
  });
});

describe('apiGet', () => {
  it('2xx 以外は ProblemDetail の detail を持つ ApiError を投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: 404, detail: 'カードが見つかりません: id=9' }), {
            status: 404,
            headers: { 'Content-Type': 'application/problem+json' },
          }),
        ),
      ),
    );

    await expect(apiGet('/api/cards/9')).rejects.toMatchObject({
      status: 404,
      message: 'カードが見つかりません: id=9',
    });
  });

  it('fetch 自体が失敗したら status が null の ApiError を投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const error = await apiGet('/api/cards').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBeNull();
  });
});
