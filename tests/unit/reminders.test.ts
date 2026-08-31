import { describe, it, expect } from 'vitest';
import {
  pendingReminders,
  computeAlarms,
  snoozeUntil,
  entryIdFromAlarmName,
  notificationFor,
} from '../../src/lib/reminders';
import type { Entry } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'a',
    title: 'Bài hay',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('pendingReminders', () => {
  it('R-01: giữ entry có reminderAt ở tương lai', () => {
    const entries = [entry({ id: 'a', reminderAt: 2000 }), entry({ id: 'b' })];
    const result = pendingReminders(entries, 1000);
    expect(result.map((e) => e.id)).toEqual(['a']);
  });

  it('R-02: loại entry reminderAt đã qua', () => {
    const entries = [entry({ reminderAt: 500 })];
    expect(pendingReminders(entries, 1000)).toHaveLength(0);
  });

  it('R-03: sắp xếp gần nhất trước', () => {
    const entries = [
      entry({ id: 'far', reminderAt: 5000 }),
      entry({ id: 'near', reminderAt: 2000 }),
    ];
    const result = pendingReminders(entries, 1000);
    expect(result.map((e) => e.id)).toEqual(['near', 'far']);
  });
});

describe('computeAlarms', () => {
  it('R-04: sinh đúng tên và thời điểm', () => {
    const entries = [entry({ id: 'a', reminderAt: 5000 })];
    expect(computeAlarms(entries, 1000)).toEqual([{ name: 'reminder-a', when: 5000 }]);
  });

  it('R-05: bỏ qua entry không có reminder tương lai', () => {
    const entries = [entry({ reminderAt: 500 })];
    expect(computeAlarms(entries, 1000)).toEqual([]);
  });
});

describe('snoozeUntil', () => {
  it('R-06: 15m', () => expect(snoozeUntil('15m', 0)).toBe(900000));
  it('R-07: 1h', () => expect(snoozeUntil('1h', 0)).toBe(3600000));
  it('R-08: 1d', () => expect(snoozeUntil('1d', 0)).toBe(86400000));
});

describe('entryIdFromAlarmName', () => {
  it('R-09: hợp lệ', () => expect(entryIdFromAlarmName('reminder-abc')).toBe('abc'));
  it('R-10: sai tiền tố', () => expect(entryIdFromAlarmName('khac-abc')).toBeNull());
});

describe('notificationFor', () => {
  it('R-11: tìm thấy entry', () => {
    const entries = [entry({ id: 'a', title: 'Bài hay' })];
    expect(notificationFor(entries, 'reminder-a')).toEqual({
      id: 'a',
      title: 'Reading Diary Reminder',
      message: 'Xem lại: Bài hay',
    });
  });

  it('R-12: không tìm thấy entry', () => {
    const entries = [entry({ id: 'a' })];
    expect(notificationFor(entries, 'reminder-khong-ton-tai')).toBeNull();
  });
});
