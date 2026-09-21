import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { AddCardForm } from './AddCardForm';

/** フォームを描画して開いた状態にする */
async function renderOpened(onSubmit = vi.fn(() => Promise.resolve())) {
  const user = userEvent.setup();
  render(<AddCardForm listId="todo" onSubmit={onSubmit} />);
  await user.click(screen.getByRole('button', { name: '＋ カードを追加' }));
  return { user, onSubmit };
}

describe('AddCardForm', () => {
  it('最初はボタンだけを表示し、押すと入力欄が開いてフォーカスが当たる', async () => {
    const user = userEvent.setup();
    render(<AddCardForm listId="todo" onSubmit={vi.fn()} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '＋ カードを追加' }));

    const input = screen.getByRole('textbox', { name: 'タイトル' });
    expect(input).toHaveFocus();
    // 優先度の初期値は「中」
    expect(screen.getByRole('radio', { name: '中' })).toBeChecked();
  });

  it('タイトルが空白だけなら送信しない', async () => {
    const { user, onSubmit } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('前後の空白を除いたタイトルと選んだ優先度、listId を渡して送信する', async () => {
    const { user, onSubmit } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '  買い物  ');
    await user.click(screen.getByRole('radio', { name: '高' }));
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: '買い物', priority: 'high', listId: 'todo' });
  });

  it('Enter でも送信できる', async () => {
    const { user, onSubmit } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '読書{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ title: '読書', priority: 'medium', listId: 'todo' });
  });

  it('送信に成功すると入力欄を空にして開いたままにし、優先度を「中」に戻す', async () => {
    const { user } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '買い物');
    await user.click(screen.getByRole('radio', { name: '低' }));
    await user.click(screen.getByRole('button', { name: '追加' }));

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.getByRole('radio', { name: '中' })).toBeChecked();
  });

  it('送信に失敗すると文言を表示し、入力内容は残す', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new ApiError(500, 'boom')));
    const { user } = await renderOpened(onSubmit);

    await user.type(screen.getByRole('textbox'), '買い物');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーでエラーが発生しました');
    expect(screen.getByRole('textbox')).toHaveValue('買い物');
  });

  it('400 のときは API の detail をそのまま表示する', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new ApiError(400, 'タイトルは必須です')));
    const { user } = await renderOpened(onSubmit);

    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('タイトルは必須です');
  });

  it('キャンセルで閉じてボタンに戻り、入力内容は消える', async () => {
    const { user } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '途中まで');
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ カードを追加' })).toBeInTheDocument();

    // もう一度開いても前の入力は残っていない
    await user.click(screen.getByRole('button', { name: '＋ カードを追加' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('入力欄で Escape を押すと閉じる', async () => {
    const { user } = await renderOpened();

    await user.type(screen.getByRole('textbox'), '途中まで{Escape}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ カードを追加' })).toBeInTheDocument();
  });
});
