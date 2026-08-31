import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Entry, EntryDraft, ValidationErrors } from '../lib/types';
import { validateEntry } from '../lib/validation';
import { TagInput } from './TagInput';

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  initial?: Entry;
  defaultUrl?: string;
  allTags?: string[];
  onSubmit: (draft: EntryDraft) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({ initial, defaultUrl, allTags = [], onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'blog');
  const [content, setContent] = useState(initial?.content ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? defaultUrl ?? '');
  const [reminderAt, setReminderAt] = useState<string>(
    initial?.reminderAt ? toDatetimeLocal(initial.reminderAt) : '',
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const autofilledUrl = useRef(false);

  // F1.4: con trỏ nhảy vào ô tiêu đề ngay khi popup mở
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // URL tab về sau khi popup đã mount, nên phải điền muộn — nhưng chỉ khi tạo mới,
  // và chỉ MỘT LẦN DUY NHẤT, không ghi đè chữ user đã gõ vào ô Nguồn.
  useEffect(() => {
    if (!initial && defaultUrl && !autofilledUrl.current) {
      setSourceUrl(defaultUrl);
      autofilledUrl.current = true;
    }
  }, [initial, defaultUrl]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const draft: EntryDraft = {
      title: title.trim(),
      category,
      tags,
      content: content || undefined,
      sourceUrl: sourceUrl || undefined,
      reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
    };

    const found = validateEntry(draft);

    // ponytail: if reminderAt wasn't changed from initial, don't reject past values.
    // Allow editing entries with expired reminders so long as user didn't alter the reminder.
    // Compare at minute-level precision since datetime-local input only captures YYYY-MM-DDTHH:mm.
    const initialReminderMs = initial?.reminderAt;
    const initialReminderMinute = initialReminderMs ? Math.floor(initialReminderMs / 60000) : undefined;
    const draftReminderMinute = draft.reminderAt ? Math.floor(draft.reminderAt / 60000) : undefined;
    if (found.reminderAt && initialReminderMinute === draftReminderMinute && initialReminderMinute !== undefined) {
      delete found.reminderAt;
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await onSubmit(draft);
      if (!initial) {
        // Chỉ dọn form khi tạo mới. Lưu hỏng thì ném lỗi, không chạy tới đây.
        setTitle('');
        setContent('');
        setTags([]);
        setReminderAt('');
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

      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium">
          Thẻ
        </label>
        <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
        {errors.tags && (
          <p id="tags-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.tags}
          </p>
        )}
      </div>

      <Field label="Nhắc nhở" id="reminderAt" error={errors.reminderAt}>
        {(props) => (
          <input
            {...props}
            type="datetime-local"
            value={reminderAt}
            onChange={(e) => setReminderAt(e.target.value)}
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
