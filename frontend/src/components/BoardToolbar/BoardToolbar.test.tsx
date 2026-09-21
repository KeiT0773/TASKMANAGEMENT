import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BoardToolbar } from './BoardToolbar';

const button = () => screen.getByRole('button', { name: /優先度順に並べ替え|並べ替え中/ });

describe('BoardToolbar', () => {
  it('「優先度順に並べ替え」を押すと onSort が呼ばれる', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn(() => Promise.resolve());
    render(<BoardToolbar onSort={onSort} />);

    await user.click(screen.getByRole('button', { name: '優先度順に並べ替え' }));

    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('実行中はボタンが無効になり「並べ替え中…」と表示され、終わると戻る', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onSort = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<BoardToolbar onSort={onSort} />);

    await user.click(button());
    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent('並べ替え中…');

    // 無効な間にもう一度押しても呼ばれない
    await user.click(button());
    expect(onSort).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(button()).toBeEnabled());
    expect(button()).toHaveTextContent('優先度順に並べ替え');
  });

  it('onSort が失敗してもボタンは有効に戻る', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn(() => Promise.reject(new Error('boom')));
    render(<BoardToolbar onSort={onSort} />);

    await user.click(button());

    await waitFor(() => expect(button()).toBeEnabled());
  });
});
