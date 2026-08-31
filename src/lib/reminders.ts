import type { Entry } from './types';

export function pendingReminders(entries: Entry[], now: number): Entry[] {
  return entries
    .filter((e) => e.reminderAt !== undefined && e.reminderAt > now)
    .sort((a, b) => (a.reminderAt ?? 0) - (b.reminderAt ?? 0));
}

export type AlarmSpec = { name: string; when: number };

export function computeAlarms(entries: Entry[], now: number): AlarmSpec[] {
  return pendingReminders(entries, now).map((e) => ({
    name: `reminder-${e.id}`,
    when: e.reminderAt as number,
  }));
}

export type SnoozeDuration = '15m' | '1h' | '1d';

const SNOOZE_MS: Record<SnoozeDuration, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

export function snoozeUntil(duration: SnoozeDuration, now: number): number {
  return now + SNOOZE_MS[duration];
}

const ALARM_PREFIX = 'reminder-';

export function entryIdFromAlarmName(alarmName: string): string | null {
  return alarmName.startsWith(ALARM_PREFIX) ? alarmName.slice(ALARM_PREFIX.length) : null;
}

export function notificationFor(
  entries: Entry[],
  alarmName: string,
): { id: string; title: string; message: string } | null {
  const id = entryIdFromAlarmName(alarmName);
  if (!id) return null;
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  return { id: entry.id, title: 'Reading Diary Reminder', message: `Xem lại: ${entry.title}` };
}
