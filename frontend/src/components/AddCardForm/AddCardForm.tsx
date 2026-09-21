import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError } from '../../api/client';
import { PRIORITIES } from '../../constants/priority';
import type { CardCreateInput, ListId, Priority } from '../../types/board';
import { errorMessage } from '../../utils/errorMessage';
import { PriorityBadge } from '../PriorityBadge/PriorityBadge';
import styles from './AddCardForm.module.css';

interface Props {
  listId: ListId;
  /** 送信先。useBoard の addCard を渡す。失敗したときは ApiError を投げること */
  onSubmit: (input: CardCreateInput) => Promise<void>;
}

const DEFAULT_PRIORITY: Priority = 'medium';

/**
 * リスト下部の「＋ カードを追加」ボタンと、押したときに現れる入力フォーム（FR-01、フロントエンド設計書 8.5）。
 * 入力内容・開閉・送信中・失敗の状態を自分で持ち、送信そのものは onSubmit に委ねる。
 */
export function AddCardForm({ listId, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 開いたとき、および送信が終わったときに入力欄へフォーカスを当てる。
  // 送信中は入力欄が disabled でフォーカスできないため、submitting が false に戻るのを待つ。
  useEffect(() => {
    if (open && !submitting) {
      inputRef.current?.focus();
    }
  }, [open, submitting]);

  function close() {
    setOpen(false);
    setTitle('');
    setPriority(DEFAULT_PRIORITY);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '') {
      // タイトルが空のときは登録しない（FR-01）。文言は出さず、入力欄に戻すだけ
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ title: trimmed, priority, listId });
      // 続けて追加できるよう、入力欄は開いたまま初期値に戻す（フォーカスは上の useEffect が戻す）
      setTitle('');
      setPriority(DEFAULT_PRIORITY);
      setError(null);
    } catch (err: unknown) {
      // 入力内容は残し、文言だけを出す（フロントエンド設計書 2. 方針 7）
      setError(err instanceof ApiError ? err : new ApiError(null, String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      close();
    }
  }

  if (!open) {
    return (
      <div className={styles.addArea}>
        <button type="button" className={styles.addButton} onClick={() => setOpen(true)}>
          ＋ カードを追加
        </button>
      </div>
    );
  }

  // ラジオボタンの name はリストごとに分け、3 列のフォームが互いに干渉しないようにする
  const radioName = `add-priority-${listId}`;

  return (
    <div className={styles.addArea}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="タイトルを入力"
          aria-label="タイトル"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
        />
        <div className={styles.priorityOptions}>
          {PRIORITIES.map((p) => (
            <label key={p} className={styles.priorityOption}>
              <input
                type="radio"
                name={radioName}
                value={p}
                checked={priority === p}
                onChange={() => setPriority(p)}
                disabled={submitting}
              />
              <PriorityBadge priority={p} />
            </label>
          ))}
        </div>
        {error !== null && (
          <p className={styles.error} role="alert">
            {errorMessage(error)}
          </p>
        )}
        <div className={styles.buttons}>
          <button type="submit" className={styles.primary} disabled={submitting}>
            追加
          </button>
          <button type="button" className={styles.secondary} onClick={close} disabled={submitting}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
