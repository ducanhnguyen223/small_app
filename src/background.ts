import { chromeStorage, onEntriesChanged } from './storage';
import { computeAlarms, notificationFor, pendingReminders } from './lib/reminders';

const NOTIFICATION_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">' +
      '<rect width="128" height="128" rx="24" fill="#4f46e5"/>' +
      '<text x="64" y="88" font-size="72" text-anchor="middle">📖</text></svg>',
  );

const ALARM_PREFIX = 'reminder-';

export async function reconcile(): Promise<void> {
  const entries = await chromeStorage.load();
  const now = Date.now();

  const existing = await chrome.alarms.getAll();
  await Promise.all(
    existing
      .filter((a) => a.name.startsWith(ALARM_PREFIX))
      .map((a) => chrome.alarms.clear(a.name)),
  );

  computeAlarms(entries, now).forEach((a) => chrome.alarms.create(a.name, { when: a.when }));

  const count = pendingReminders(entries, now).length;
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
}

export async function handleAlarm(alarm: { name: string }): Promise<void> {
  const entries = await chromeStorage.load();
  const notif = notificationFor(entries, alarm.name);
  if (!notif) return;
  chrome.notifications.create(notif.id, {
    type: 'basic',
    iconUrl: NOTIFICATION_ICON,
    title: notif.title,
    message: notif.message,
  });
  await reconcile();
}

export function handleNotificationClick(notificationId: string): void {
  const url = `${chrome.runtime.getURL('src/popup/index.html')}?entryId=${encodeURIComponent(notificationId)}`;
  chrome.tabs.create({ url });
  chrome.notifications.clear(notificationId);
}

if (typeof chrome !== 'undefined') {
  chrome.alarms.onAlarm.addListener(handleAlarm);
  chrome.notifications.onClicked.addListener(handleNotificationClick);
  onEntriesChanged(() => {
    void reconcile();
  });
  void reconcile();
}
