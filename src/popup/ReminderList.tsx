import { pendingReminders, snoozeUntil } from '../lib/reminders';
import type { Entry } from '../lib/types';

type Props = {
  entries: Entry[];
  now?: () => number;
  onSnooze: (id: string, newReminderAt: number) => Promise<void>;
  onSelect: (entry: Entry) => void;
};

export function ReminderList({ entries, now = () => Date.now(), onSnooze, onSelect }: Props) {
  const pending = pendingReminders(entries, now());

  if (pending.length === 0) {
    return <p className="p-4 text-sm text-slate-500">Không có nhắc nhở nào</p>;
  }

  return (
    <ul className="flex flex-col gap-2 p-2">
      {pending.map((entry) => (
        <li key={entry.id} className="rounded border p-2">
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className="block text-left font-medium"
          >
            {entry.title}
          </button>
          <p className="text-xs text-slate-500">
            {new Date(entry.reminderAt as number).toLocaleString('vi-VN')}
          </p>
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              onClick={() => onSnooze(entry.id, snoozeUntil('15m', now()))}
              className="rounded bg-slate-200 px-2 py-0.5 text-xs"
            >
              +15 phút
            </button>
            <button
              type="button"
              onClick={() => onSnooze(entry.id, snoozeUntil('1h', now()))}
              className="rounded bg-slate-200 px-2 py-0.5 text-xs"
            >
              +1 giờ
            </button>
            <button
              type="button"
              onClick={() => onSnooze(entry.id, snoozeUntil('1d', now()))}
              className="rounded bg-slate-200 px-2 py-0.5 text-xs"
            >
              +1 ngày
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
