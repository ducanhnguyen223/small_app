import type { Entry, StorageAdapter } from './lib/types';

export const ENTRIES_KEY = 'entries';

export const chromeStorage: StorageAdapter = {
  async load() {
    const result = await chrome.storage.local.get(ENTRIES_KEY);
    const value = result[ENTRIES_KEY];
    return Array.isArray(value) ? (value as Entry[]) : [];
  },
  async save(entries) {
    await chrome.storage.local.set({ [ENTRIES_KEY]: entries });
  },
};

/** Đăng ký nghe thay đổi key entries. Trả về hàm huỷ đăng ký. */
export function onEntriesChanged(callback: () => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'local' && ENTRIES_KEY in changes) callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
