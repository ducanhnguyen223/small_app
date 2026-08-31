import { describe, it, expect, vi, afterEach } from 'vitest';
import { installFakeChrome } from '../helpers/fakeChrome';
import { reconcile, handleAlarm, handleNotificationClick } from '../../src/background';
import type { Entry } from '../../src/lib/types';

const future: Entry = {
  id: 'a',
  title: 'Bài hay',
  category: 'blog',
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
  reminderAt: Date.now() + 60_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reconcile', () => {
  it('BG-01: tạo đúng 1 alarm cho entry có reminder tương lai', async () => {
    const fake = installFakeChrome({ entries: [future] });
    await reconcile();
    expect(Object.keys(fake.alarms)).toEqual([`reminder-${future.id}`]);
  });

  it('BG-02: xoá alarm cũ trước khi tạo lại', async () => {
    const fake = installFakeChrome({ entries: [future] });
    fake.alarms['reminder-cu-khong-con-ton-tai'] = 999;
    await reconcile();
    expect(fake.alarms['reminder-cu-khong-con-ton-tai']).toBeUndefined();
  });

  it('BG-03: cập nhật badge đúng số lượng pending', async () => {
    const fake = installFakeChrome({ entries: [future] });
    await reconcile();
    expect(fake.badgeText()).toBe('1');
  });

  it('BG-04: badge rỗng khi không có reminder', async () => {
    const fake = installFakeChrome({ entries: [] });
    await reconcile();
    expect(fake.badgeText()).toBe('');
  });
});

describe('handleAlarm', () => {
  it('BG-05: tạo notification đúng nội dung', async () => {
    const fake = installFakeChrome({ entries: [future] });
    await handleAlarm({ name: `reminder-${future.id}` });
    expect(fake.notifications[future.id]).toMatchObject({
      title: 'Reading Diary Reminder',
      message: 'Xem lại: Bài hay',
    });
  });

  it('BG-06: không tạo notification khi alarm không khớp entry', async () => {
    const fake = installFakeChrome({ entries: [future] });
    await handleAlarm({ name: 'reminder-khong-ton-tai' });
    expect(Object.keys(fake.notifications)).toHaveLength(0);
  });
});

describe('handleNotificationClick', () => {
  it('BG-07: mở tab đúng URL chứa entryId', () => {
    const fake = installFakeChrome({ entries: [future] });
    handleNotificationClick(future.id);
    expect(fake.createdTabs[0].url).toContain(`entryId=${future.id}`);
  });

  it('BG-08: xoá notification sau khi click', () => {
    const fake = installFakeChrome({ entries: [future] });
    fake.notifications[future.id] = {};
    handleNotificationClick(future.id);
    expect(fake.notifications[future.id]).toBeUndefined();
  });
});
