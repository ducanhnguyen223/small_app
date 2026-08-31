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

  const alarmsStore: Record<string, number> = {};
  const alarmListeners: Array<(alarm: { name: string }) => void> = [];
  const notificationsStore: Record<string, unknown> = {};
  const notificationClickListeners: Array<(id: string) => void> = [];
  const createdTabs: { url: string }[] = [];
  let badgeText = '';

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
      create: (opts: { url: string }) => {
        createdTabs.push(opts);
      },
    },
    alarms: {
      create: (name: string, opts: { when: number }) => {
        alarmsStore[name] = opts.when;
      },
      clear: async (name: string) => {
        delete alarmsStore[name];
        return true;
      },
      getAll: async () => Object.entries(alarmsStore).map(([name, when]) => ({ name, when })),
      onAlarm: {
        addListener: (l: (alarm: { name: string }) => void) => {
          alarmListeners.push(l);
        },
      },
    },
    notifications: {
      create: (id: string, opts: unknown) => {
        notificationsStore[id] = opts;
      },
      clear: async (id: string) => {
        delete notificationsStore[id];
      },
      onClicked: {
        addListener: (l: (id: string) => void) => {
          notificationClickListeners.push(l);
        },
      },
    },
    action: {
      setBadgeText: async (opts: { text: string }) => {
        badgeText = opts.text;
      },
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
    },
  };

  vi.stubGlobal('chrome', fake);

  return {
    store,
    /** Bắt lần ghi tiếp theo thất bại, để test đường lỗi. */
    failNextSave: () => {
      failing = true;
    },
    alarms: alarmsStore,
    notifications: notificationsStore,
    badgeText: () => badgeText,
    triggerAlarm: (name: string) => alarmListeners.forEach((l) => l({ name })),
    triggerNotificationClick: (id: string) => notificationClickListeners.forEach((l) => l(id)),
    createdTabs,
  };
}
