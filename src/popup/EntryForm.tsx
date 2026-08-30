import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Entry, EntryDraft, ValidationErrors } from '../lib/types';
import { validateEntry } from '../lib/validation';

type Props = {
  initial?: Entry;
  defaultUrl?: string;
  onSubmit: (draft: EntryDraft) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({ initial, defaultUrl, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'blog');
  const [content, setContent] = useState(initial?.content ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? defaultUrl ?? '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);

  // F1.4: con trỏ nhảy vào ô tiêu đề ngay khi popup mở
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // URL tab về sau khi popup đã mount, nên phải điền muộn — nhưng chỉ khi tạo mới
  useEffect(() => {
    if (!initial && defaultUrl) setSourceUrl(defaultUrl);
  }, [initial, defaultUrl]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const draft: EntryDraft = {
      title,
      category,
      tags: initial?.tags ?? [],
      content: content || undefined,
      sourceUrl: sourceUrl || undefined,
      reminderAt: initial?.reminderAt,
    };

    const found = validateEntry(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await onSubmit(draft);
      if (!initial) {
        // Chỉ dọn form khi tạo mới. Lưu hỏng thì ném lỗi, không chạy tới đây.
        setTitle('');
        setContent('');
      }
    } catch {
      // Store đã đặt error để App hiện toast. Ở đây cố ý không đụng vào state form
      // — mất chữ người dùng vừa gõ là hỏng dữ liệu, không phải phiền toái nhỏ.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <Field label="Tiêu đề" id="title" error={errors.title}>
        {(props) => (
          <input
            {...props}
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <Field label="Phân loại" id="category" error={errors.category}>
        {(props) => (
          <select
            {...props}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded border px-2 py-1"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Ghi chú" id="content" error={errors.content}>
        {(props) => (
          <textarea
            {...props}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <Field label="Nguồn" id="sourceUrl" error={errors.sourceUrl}>
        {(props) => (
          <input
            {...props}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <div className="flex gap-2">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
          Lưu
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-3 py-1">
            Huỷ
          </button>
        )}
      </div>
    </form>
  );
}

type FieldRenderProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/** Nối label, input và thông báo lỗi lại với nhau cho screen reader (PRD §7.1). */
function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': error ? errorId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
