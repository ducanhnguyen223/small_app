import { useEffect, useState } from 'react';
import { EntryForm } from './EntryForm';
import { EntryList } from './EntryList';
import { onEntriesChanged } from '../storage';
import { useDiaryStore } from '../store/diaryStore';
import type { Entry, EntryDraft } from '../lib/types';

export default function App() {
  const entries = useDiaryStore((s) => s.entries);
  const error = useDiaryStore((s) => s.error);
  const hydrate = useDiaryStore((s) => s.hydrate);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const updateEntry = useDiaryStore((s) => s.updateEntry);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);

  const [currentUrl, setCurrentUrl] = useState<string>();
  const [editing, setEditing] = useState<Entry | null>(null);

  useEffect(() => {
    void hydrate();
    // Options page ghi thì popup thấy ngay — rẻ hơn nhiều so với message protocol
    return onEntriesChanged(() => {
      void hydrate();
    });
  }, [hydrate]);

  // F1.3: lấy URL tab hiện tại. activeTab chỉ cấp quyền khi người dùng chủ động
  // mở extension, nên phải đọc lúc popup mount chứ không sớm hơn.
  useEffect(() => {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => setCurrentUrl(tabs[0]?.url));
  }, []);

  const handleSubmit = async (draft: EntryDraft) => {
    if (editing) {
      await updateEntry(editing.id, draft);
      setEditing(null);
    } else {
      await addEntry(draft);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {error && (
        <p role="status" className="bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <EntryForm
        key={editing?.id ?? 'new'}
        initial={editing ?? undefined}
        defaultUrl={currentUrl}
        onSubmit={handleSubmit}
        onCancel={editing ? () => setEditing(null) : undefined}
      />

      <div className="flex-1 overflow-y-auto border-t">
        <EntryList entries={entries} onEdit={setEditing} onDelete={deleteEntry} />
      </div>
    </div>
  );
}
