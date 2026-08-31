import { useState } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Entry } from '../lib/types';
import { highlightMatches } from '../lib/highlight';

const CATEGORY_LABEL = new Map<Category, string>(CATEGORIES.map((c) => [c.value, c.label]));
const CATEGORY_ICON = new Map<Category, string>(CATEGORIES.map((c) => [c.value, c.icon]));

type Props = {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => Promise<void>;
  highlightQuery?: string;
};

function HighlightedTitle({ title, query }: { title: string; query?: string }) {
  if (!query) return <>{title}</>;
  return (
    <>
      {highlightMatches(title, query).map((seg, i) =>
        seg.match ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}

export function EntryList({ entries, onEdit, onDelete, highlightQuery }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-gray-500">Chưa có ghi chép nào</p>;
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await onDelete(id);
  };

  return (
    <>
      <ul className="divide-y">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                <HighlightedTitle title={entry.title} query={highlightQuery} />
              </p>
              <p className="mt-1 text-xs text-gray-500">
                <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5">
                  {CATEGORY_ICON.get(entry.category)} {CATEGORY_LABEL.get(entry.category)}
                </span>
                {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button type="button" onClick={() => onEdit(entry)} className="text-sm text-blue-600">
              Sửa
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(entry)}
              className="text-sm text-red-600"
            >
              Xoá
            </button>
          </li>
        ))}
      </ul>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xoá"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full rounded bg-white p-4">
            <p className="mb-3 text-sm">Xoá "{pendingDelete.title}"?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded border px-3 py-1 text-sm"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
