import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import { ApiError } from '../../api/client';
import { PRIORITIES } from '../../constants/priority';
import type { Card, CardUpdateInput, Priority } from '../../types/board';
import { errorMessage } from '../../utils/errorMessage';
import { PriorityBadge } from '../PriorityBadge/PriorityBadge';
import styles from './CardDetail.module.css';

interface Props {
  card: Card;
  /** 項目が確定したときの保存先。useBoard の updateCard を渡す。失敗したときは ApiError を投げること */
  onSave: (input: CardUpdateInput) => Promise<void>;
  /** 「カードを削除」を押したときの削除先。Board 経由で useBoard の deleteCard を呼ぶ。失敗したときは ApiError を投げること */
  onDelete: () => Promise<void>;
  onClose: () => void;
}

/** 失敗の文言を出す場所。4 項目のいずれか、またはフッターの削除ボタン */
type Field = 'title' | 'description' | 'dueDate' | 'priority' | 'delete';

/** 入力欄の値（下書き）。入力欄は文字列しか持てないので、null は '' で表す */
interface Draft {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
}

function draftOf(card: Card): Draft {
  return {
    title: card.title,
    description: card.description ?? '',
    dueDate: card.dueDate ?? '',
    priority: card.priority,
  };
}

/** 下書きを API の要求 body にする。空文字は null に（API 設計書 2. 方針 6） */
function toInput(draft: Draft): CardUpdateInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() === '' ? null : draft.description,
    dueDate: draft.dueDate === '' ? null : draft.dueDate,
    priority: draft.priority,
  };
}

function isSameAsCard(input: CardUpdateInput, card: Card): boolean {
  return (
    input.title === card.title &&
    input.description === card.description &&
    input.dueDate === card.dueDate &&
    input.priority === card.priority
  );
}

/**
 * カード詳細（SC-02）。ボードの手前に重ねるモーダルで、タイトル・説明文・期限・優先度を編集する
 * （フロントエンド設計書 8.6）。「保存」ボタンは無く、項目ごとに確定したときに onSave を呼ぶ。
 * フッターの「カードを削除」は確認を求めずに onDelete を呼ぶ（要件定義書 決定事項 No.4）。
 * Board は key={card.id} で描画し、別のカードを開いたときは作り直される。
 */
export function CardDetail({ card, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(card));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<{ field: Field; error: ApiError } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // 保存を直列にする。前の保存が終わる前に次の項目が確定しても、順番に送られるようにする
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // 開いたときにタイトルへフォーカスを当てる
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Escape で閉じる（フォーカスがどこにあっても効くよう window で受ける）
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /**
   * 項目が確定したときの保存。next で確定した値を上書きし、カードと同じ内容なら送らない。
   * @param field 失敗したときに文言を出す項目
   */
  function save(field: Field, next: Partial<Draft> = {}) {
    const merged: Draft = { ...draft, ...next };

    // タイトルが空白だけなら保存せず、元の値に戻す（FR-01 と同じく空のタイトルは受け付けない）
    if (merged.title.trim() === '') {
      setDraft({ ...merged, title: card.title });
      return;
    }

    const input = toInput(merged);
    if (isSameAsCard(input, card)) {
      return;
    }

    queueRef.current = queueRef.current.then(async () => {
      setSaving(true);
      try {
        await onSave(input);
        // 確定した項目だけを送った値（trim 済みなど）にそろえる。
        // 他の項目は利用者が続けて入力している途中かもしれないので触らない
        setDraft((d) => {
          if (field === 'title') return { ...d, title: input.title };
          if (field === 'description') return { ...d, description: input.description ?? '' };
          return d;
        });
        setError(null);
      } catch (err: unknown) {
        // 下書きは消さず、その項目の下に文言を出す（フロントエンド設計書 2. 方針 7）
        setError({ field, error: err instanceof ApiError ? err : new ApiError(null, String(err)) });
      } finally {
        setSaving(false);
      }
    });
  }

  /**
   * 削除。保存の直列化（queueRef）とは独立に送る。成功すればカードごと無くなり Board が閉じるので、
   * 途中の保存の結果を待つ意味が無いため。失敗したらフッターに文言を出し、モーダルは開いたまま。
   */
  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setError(null);
    } catch (err: unknown) {
      setError({
        field: 'delete',
        error: err instanceof ApiError ? err : new ApiError(null, String(err)),
      });
    } finally {
      setDeleting(false);
    }
  }

  function handleTitleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur(); // blur で保存される
    }
  }

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    // モーダルの外側（背景）を押したときだけ閉じる
    if (e.target === e.currentTarget) onClose();
  }

  /**
   * @param prefix 文言の先頭に付ける操作名（削除の失敗は入力欄が無いので「削除できませんでした。」を付ける）
   */
  function fieldError(field: Field, prefix = '') {
    if (error === null || error.field !== field) return null;
    return (
      <p className={styles.error} role="alert">
        {prefix}
        {errorMessage(error.error)}
      </p>
    );
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} data-testid="card-detail-overlay">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-detail-title"
      >
        <div className={styles.header}>
          <h2 id="card-detail-title" className={styles.heading}>
            カード詳細
            {saving && <span className={styles.saving}>保存中…</span>}
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className={styles.body}>
          {/* 文言（role=alert）をラベルの中に入れると入力欄の名前に混ざるため、label と input は id で結ぶ */}
          <div className={styles.field}>
            <label htmlFor="detail-title" className={styles.fieldLabel}>
              タイトル
            </label>
            <input
              id="detail-title"
              ref={titleRef}
              type="text"
              className={styles.input}
              maxLength={100}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onBlur={() => save('title')}
              onKeyDown={handleTitleKeyDown}
            />
            {fieldError('title')}
          </div>

          <div className={styles.field}>
            <label htmlFor="detail-description" className={styles.fieldLabel}>
              説明文
            </label>
            <textarea
              id="detail-description"
              className={styles.textarea}
              rows={4}
              maxLength={2000}
              placeholder="タスクの補足説明を入力（任意）"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              onBlur={() => save('description')}
            />
            {fieldError('description')}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="detail-due-date" className={styles.fieldLabel}>
                期限
              </label>
              <input
                id="detail-due-date"
                type="date"
                className={styles.input}
                value={draft.dueDate}
                onChange={(e) => {
                  const dueDate = e.target.value;
                  setDraft((d) => ({ ...d, dueDate }));
                  save('dueDate', { dueDate });
                }}
              />
              {fieldError('dueDate')}
            </div>

            <fieldset className={styles.field}>
              <legend className={styles.fieldLabel}>優先度</legend>
              <div className={styles.priorityOptions}>
                {PRIORITIES.map((p) => (
                  <label key={p} className={styles.priorityOption}>
                    <input
                      type="radio"
                      name="detail-priority"
                      value={p}
                      checked={draft.priority === p}
                      onChange={() => {
                        setDraft((d) => ({ ...d, priority: p }));
                        save('priority', { priority: p });
                      }}
                    />
                    <PriorityBadge priority={p} />
                  </label>
                ))}
              </div>
              {fieldError('priority')}
            </fieldset>
          </div>
        </div>

        {/* 削除ボタンは誤操作を防ぐため、右上の「閉じる」から離れた最下部に置く（画面要件書 5.2） */}
        <div className={styles.footer}>
          {fieldError('delete', '削除できませんでした。')}
          <button
            type="button"
            className={styles.delete}
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? '削除中…' : 'カードを削除'}
          </button>
        </div>
      </div>
    </div>
  );
}
