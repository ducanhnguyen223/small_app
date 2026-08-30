import { create } from 'zustand';
import type { Entry, EntryDraft, StorageAdapter } from '../lib/types';

export type DiaryState = {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addEntry: (draft: EntryDraft) => Promise<Entry>;
  updateEntry: (id: string, draft: EntryDraft) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const sortNewestFirst = (entries: Entry[]): Entry[] =>
  [...entries].sort((a, b) => b.createdAt - a.createdAt);

export function createDiaryStore(
  adapter: StorageAdapter,
  newId: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
) {
  return create<DiaryState>((set, get) => {
    /**
     * Ghi lạc quan rồi hoàn nguyên nếu adapter lỗi.
     * Ném lỗi ra ngoài để form biết mà giữ lại chữ người dùng đã gõ.
     */
    const persist = async (next: Entry[]) => {
      const previous = get().entries;
      set({ entries: next, error: null });
      try {
        await adapter.save(next);
      } catch {
        set({ entries: previous, error: 'Không lưu được dữ liệu' });
        throw new Error('save failed');
      }
    };

    return {
      entries: [],
      loading: false,
      error: null,

      hydrate: async () => {
        set({ loading: true, error: null });
        try {
          const entries = await adapter.load();
          set({ entries: sortNewestFirst(entries), loading: false });
        } catch {
          set({ error: 'Không đọc được dữ liệu', loading: false });
        }
      },

      addEntry: async (draft) => {
        const timestamp = now();
        const entry: Entry = { ...draft, id: newId(), createdAt: timestamp, updatedAt: timestamp };
        await persist(sortNewestFirst([entry, ...get().entries]));
        return entry;
      },

      updateEntry: async (id, draft) => {
        const current = get().entries;
        if (!current.some((e) => e.id === id)) return;
        const next = current.map((e) =>
          e.id === id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt, updatedAt: now() } : e,
        );
        await persist(sortNewestFirst(next));
      },

      deleteEntry: async (id) => {
        await persist(get().entries.filter((e) => e.id !== id));
      },
    };
  });
}
