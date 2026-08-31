import { useEffect, useMemo, useState } from 'react';
import { EntryForm } from './EntryForm';
import { EntryList } from './EntryList';
import { SearchBar } from './SearchBar';
import { ReminderList } from './ReminderList';
import { onEntriesChanged } from '../storage';
import { useDiaryStore } from '../store/diaryStore';
import { filterEntries } from '../lib/filter';
import type { Entry, EntryDraft, Filters } from '../lib/types';

export default function App() {
  const entries = useDiaryStore((s) => s.entries);
  const error = useDiaryStore((s) => s.error);
  const hydrate = useDiaryStore((s) => s.hydrate);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const updateEntry = useDiaryStore((s) => s.updateEntry);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);

  const [currentUrl, setCurrentUrl] = useState<string>();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [view, setView] = useState<'list' | 'reminders'>('list');
  const [handledDeepLink, setHandledDeepLink] = useState(false);

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

  // E3: Read ?entryId= deep link from URL
  useEffect(() => {
    if (handledDeepLink || entries.length === 0) return;
    const entryId = new URLSearchParams(window.location.search).get('entryId');
    if (!entryId) {
      setHandledDeepLink(true);
      return;
    }
    const found = entries.find((e) => e.id === entryId);
    if (found) setEditing(found);
    setHandledDeepLink(true);
  }, [entries, handledDeepLink]);

  const handleSubmit = async (draft: EntryDraft) => {
    if (editing) {
      await updateEntry(editing.id, draft);
      setEditing(null);
    } else {
      await addEntry(draft);
    }
  };

  const handleSnooze = async (id: string, newReminderAt: number) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    await updateEntry(id, {
      title: entry.title,
      category: entry.category,
      content: entry.content,
      tags: entry.tags,
      sourceUrl: entry.sourceUrl,
      reminderAt: newReminderAt,
    });
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);

  const visibleEntries = useMemo(() => filterEntries(entries, filters), [entries, filters]);

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
        allTags={allTags}
        onSubmit={handleSubmit}
        onCancel={editing ? () => setEditing(null) : undefined}
      />

      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
          className="flex-1 px-3 py-2 text-sm"
        >
          Danh sách
        </button>
        <button
          type="button"
          onClick={() => setView('reminders')}
          aria-pressed={view === 'reminders'}
          className="flex-1 px-3 py-2 text-sm"
        >
          Nhắc nhở
        </button>
      </div>

      <div className="flex-1 overflow-y-auto border-t">
        {view === 'list' ? (
          <>
            <SearchBar onFiltersChange={setFilters} allTags={allTags} />
            <EntryList
              entries={visibleEntries}
              onEdit={setEditing}
              onDelete={deleteEntry}
              highlightQuery={filters.text}
            />
          </>
        ) : (
          <ReminderList
            entries={entries}
            onSnooze={handleSnooze}
            onSelect={(entry) => {
              setEditing(entry);
              setView('list');
            }}
          />
        )}
      </div>
    </div>
  );
}
