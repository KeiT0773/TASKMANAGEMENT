import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { Card, CardUpdateInput } from '../../types/board';
import { CardDetail } from './CardDetail';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    title: '資料作成',
    description: '来週の定例会議で使う資料。',
    dueDate: '2026-09-22',
    priority: 'medium',
    listId: 'todo',
    displayOrder: 0,
    createdAt: '2026-09-20T01:00:00Z',
    updatedAt: '2026-09-20T01:00:00Z',
    ...overrides,
  };
}

type SaveFn = (input: CardUpdateInput) => Promise<void>;
type DeleteFn = () => Promise<void>;

function renderDetail(
  card = makeCard(),
  onSave = vi.fn<SaveFn>(() => Promise.resolve()),
  onClose = vi.fn(),
  onDelete = vi.fn<DeleteFn>(() => Promise.resolve()),
) {
  const user = userEvent.setup();
  render(<CardDetail card={card} onSave={onSave} onDelete={onDelete} onClose={onClose} />);
  return { user, onSave, onClose, onDelete };
}

const titleBox = () => screen.getByRole('textbox', { name: 'タイトル' });
const descBox = () => screen.getByRole('textbox', { name: '説明文' });
const dateBox = () => screen.getByLabelText('期限') as HTMLInputElement;

describe('CardDetail', () => {
  it('カードの値を入力欄に表示し、タイトルにフォーカスが当たる', () => {
    renderDetail();

    expect(screen.getByRole('dialog', { name: 'カード詳細' })).toBeInTheDocument();
    expect(titleBox()).toHaveValue('資料作成');
    expect(titleBox()).toHaveFocus();
    expect(descBox()).toHaveValue('来週の定例会議で使う資料。');
    expect(dateBox()).toHaveValue('2026-09-22');
    expect(screen.getByRole('radio', { name: '中' })).toBeChecked();
  });

  it('説明文と期限が null なら空欄になる', () => {
    renderDetail(makeCard({ description: null, dueDate: null }));
    expect(descBox()).toHaveValue('');
    expect(dateBox()).toHaveValue('');
  });

  it('タイトルを変えてフォーカスを外すと、4 項目をまとめて保存する', async () => {
    const { user, onSave } = renderDetail();

    await user.clear(titleBox());
    await user.type(titleBox(), '  資料作成（改）  ');
    await user.tab(); // blur

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        title: '資料作成（改）',
        description: '来週の定例会議で使う資料。',
        dueDate: '2026-09-22',
        priority: 'medium',
      }),
    );
    // 下書きは trim 後の値にそろう
    expect(titleBox()).toHaveValue('資料作成（改）');
  });

  it('Enter でもタイトルを保存する', async () => {
    const { user, onSave } = renderDetail();

    await user.type(titleBox(), '２{Enter}');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]![0]).toMatchObject({ title: '資料作成２' });
  });

  it('何も変えずにフォーカスを外しても保存しない', async () => {
    const { user, onSave } = renderDetail();

    await user.click(titleBox());
    await user.tab();
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('タイトルを空白だけにしてフォーカスを外すと、保存せず元の値に戻る', async () => {
    const { user, onSave } = renderDetail();

    await user.clear(titleBox());
    await user.type(titleBox(), '   ');
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
    expect(titleBox()).toHaveValue('資料作成');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('説明文を空にすると null で保存する', async () => {
    const { user, onSave } = renderDetail();

    await user.clear(descBox());
    await user.tab();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]![0]).toMatchObject({ description: null });
  });

  it('期限を変えると即座に保存し、消すと null で保存する', async () => {
    const { user, onSave } = renderDetail();

    await user.clear(dateBox());
    await user.type(dateBox(), '2026-10-01');
    await waitFor(() =>
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ dueDate: '2026-10-01' })),
    );

    await user.clear(dateBox());
    await waitFor(() =>
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ dueDate: null })),
    );
  });

  it('優先度を選び直すと即座に保存する', async () => {
    const { user, onSave } = renderDetail();

    await user.click(screen.getByRole('radio', { name: '高' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]![0]).toMatchObject({ priority: 'high' });
    expect(screen.getByRole('radio', { name: '高' })).toBeChecked();
  });

  it('保存に失敗するとその項目の下に文言を出し、入力は残す', async () => {
    const onSave = vi.fn<SaveFn>(() => Promise.reject(new ApiError(500, 'boom')));
    const { user } = renderDetail(makeCard(), onSave);

    await user.clear(titleBox());
    await user.type(titleBox(), '失敗する');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーでエラーが発生しました');
    expect(titleBox()).toHaveValue('失敗する');
  });

  it('400 のときは API の detail をそのまま表示する', async () => {
    const onSave = vi.fn<SaveFn>(() =>
      Promise.reject(new ApiError(400, 'タイトルは100文字以内で入力してください')),
    );
    const { user } = renderDetail(makeCard(), onSave);

    await user.type(titleBox(), 'x');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルは100文字以内で入力してください',
    );
  });

  it('「閉じる」ボタン・背景クリック・Escape で onClose が呼ばれる', async () => {
    const { user, onClose } = renderDetail();

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await user.click(screen.getByTestId('card-detail-overlay'));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('モーダルの内側をクリックしても閉じない', async () => {
    const { user, onClose } = renderDetail();

    await user.click(screen.getByRole('dialog'));
    await user.click(descBox());

    expect(onClose).not.toHaveBeenCalled();
  });

  it('「カードを削除」を押すと確認なしに onDelete が呼ばれ、押している間は無効になる', async () => {
    let resolveDelete!: () => void;
    const onDelete = vi.fn<DeleteFn>(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const { user, onSave, onClose } = renderDetail(makeCard(), undefined, undefined, onDelete);

    const button = screen.getByRole('button', { name: 'カードを削除' });
    await user.click(button);

    expect(onDelete).toHaveBeenCalledTimes(1);
    // 応答待ちの間は「削除中…」で無効（二重送信の防止）
    expect(screen.getByRole('button', { name: '削除中…' })).toBeDisabled();
    // 確認ダイアログは無く、保存や閉じる操作も起きない
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    resolveDelete();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'カードを削除' })).not.toBeDisabled(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('削除に失敗するとフッターに文言を出し、モーダルは開いたまま', async () => {
    const onDelete = vi.fn<DeleteFn>(() => Promise.reject(new ApiError(500, 'boom')));
    const { user, onClose } = renderDetail(makeCard(), undefined, undefined, onDelete);

    await user.click(screen.getByRole('button', { name: 'カードを削除' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '削除できませんでした。サーバーでエラーが発生しました。',
    );
    expect(screen.getByRole('dialog', { name: 'カード詳細' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // もう一度押せる
    expect(screen.getByRole('button', { name: 'カードを削除' })).not.toBeDisabled();
  });
});
