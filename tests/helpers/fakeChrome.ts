import { vi } from 'vitest';

type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  areaName: string,
) => void;

/**
 * Fake tối thiểu của chrome.storage.local + chrome.tabs, đủ cho tầng integration.
 * Trả về `store` để test đọc thẳng trạng thái đã ghi.
 */
export function installFakeChrome(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  const listeners: ChangeListener[] = [];
  let failing = false;

  const fake = {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (items: Record<string, unknown>) => {
          if (failing) {
            failing = false;
            throw new Error('QUOTA_BYTES quota exceeded');
          }
          const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: store[k], newValue: v };
            store[k] = v;
          }
          listeners.forEach((l) => l(changes, 'local'));
        },
      },
      onChanged: {
        addListener: (l: ChangeListener) => {
          listeners.push(l);
        },
        removeListener: (l: ChangeListener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        },
      },
    },
    tabs: {
      query: async () => [
        { url: 'https://example.com/bai-viet', title: 'Bài viết ví dụ' },
      ],
    },
  };

  vi.stubGlobal('chrome', fake);

  return {
    store,
    /** Bắt lần ghi tiếp theo thất bại, để test đường lỗi. */
    failNextSave: () => {
      failing = true;
    },
  };
}
