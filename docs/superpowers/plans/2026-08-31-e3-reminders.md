# Reading Diary — E3 Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đặt thời điểm nhắc nhở khi tạo/sửa entry, nhận Chrome notification đúng lúc, thấy badge đếm số nhắc nhở đang chờ, xem danh sách nhắc nhở và snooze (15 phút/1 giờ/1 ngày), click notification mở đúng entry.

**Architecture:** Logic tính lịch alarm/badge/nội dung notification nằm trong `src/lib/reminders.ts` — hàm thuần, test không cần mock. `src/background.ts` (service worker) là lớp mỏng nối các hàm thuần đó với `chrome.alarms`/`chrome.notifications`/`chrome.action` — không giữ state riêng, luôn đọc thẳng `chromeStorage.load()` khi cần (đúng quyết định kiến trúc ở spec §3.1: SW không giữ state). Khi entries đổi (`onEntriesChanged`) hoặc SW khởi động lại, `reconcile()` xoá hết alarm cũ tiền tố `reminder-` rồi tạo lại từ đầu — đơn giản, đúng luôn, không cần diff alarm cũ/mới.

**Tech Stack:** React 19, TypeScript, Vitest + RTL, `chrome.alarms`/`chrome.notifications`/`chrome.action` (fake mở rộng trong `tests/helpers/fakeChrome.ts`), Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-reading-diary-design.md`

## Global Constraints

- `src/lib/**` KHÔNG được import `chrome` hoặc `zustand`.
- Permissions đúng 4 cái: `storage`, `alarms`, `notifications`, `activeTab` — KHÔNG thêm `tabs` (đã có sẵn từ E0; `chrome.tabs.create` KHÔNG cần quyền `tabs`, chỉ `chrome.tabs.query` đọc tab khác mới cần — không dùng ở đây).
- UI viết cứng tiếng Việt. Không cài thư viện i18n.
- Không gọi API ngoài, không tracking, không analytics.
- Notification content đúng PRD: title `'Reading Diary Reminder'`, body `'Xem lại: {entry.title}'`.
- Snooze 3 mức: 15 phút, 1 giờ, 1 ngày (PRD F6.5).
- Service worker không giữ state — mọi lần cần dữ liệu đều `chromeStorage.load()` lại (spec §3.1).
- Quy trình test theo `CLAUDE.md`: tuần tự unit → integration → e2e. Không song song. Không sang tầng sau khi tầng trước chưa xanh.
- Trước mỗi tầng, agent tester viết test case markdown và phải dừng chờ duyệt trước khi viết test thật (test case doc gate).
- Commit sau mỗi task. Epic xanh cả 3 tầng thì commit `feat(E3): ...`.

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/lib/reminders.ts` | `pendingReminders`, `computeAlarms`, `snoozeUntil`, `entryIdFromAlarmName`, `notificationFor`. Thuần. |
| `src/background.ts` | Modify: service worker thật — `reconcile()`, `handleAlarm()`, `handleNotificationClick()`, đăng ký listener. |
| `tests/helpers/fakeChrome.ts` | Modify: thêm fake `chrome.alarms`, `chrome.notifications`, `chrome.action`, `chrome.runtime.getURL`. |
| `src/popup/EntryForm.tsx` | Modify: thêm field `datetime-local` cho `reminderAt`. |
| `src/popup/ReminderList.tsx` | Danh sách nhắc nhở đang chờ + nút snooze. |
| `src/popup/App.tsx` | Modify: tab Danh sách/Nhắc nhở, đọc `?entryId=` từ URL để mở đúng entry khi click notification. |
| `tests/unit/reminders.test.ts` | Tầng unit |
| `tests/integration/background.test.ts` | Tầng integration |
| `tests/integration/EntryFormReminder.test.tsx` | Tầng integration |
| `tests/integration/ReminderList.test.tsx` | Tầng integration |
| `tests/integration/AppReminders.test.tsx` | Tầng integration |
| `tests/e2e/e3-reminders.spec.ts` | Tầng e2e |

---

## Task 1: Viết test case tầng UNIT cho E3 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/unit/e3-reminders.md`

**Interfaces:**
- Consumes: `docs/PRD.md` F6, spec §3.1
- Produces: tài liệu test case được duyệt, đầu vào cho Task 2

- [ ] **Step 1: Gọi agent `unit-tester` (Phase 1)**

Giao agent viết `docs/test-cases/unit/e3-reminders.md`, phủ module `src/lib/reminders.ts`:

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| R-01 | `pendingReminders` lọc entry có `reminderAt` ở tương lai | entry `reminderAt: now+1000`, entry khác không có `reminderAt` | chỉ entry có `reminderAt` tương lai có mặt |
| R-02 | `pendingReminders` loại entry `reminderAt` đã qua | `reminderAt: now-1000` | entry bị loại |
| R-03 | `pendingReminders` sắp xếp gần nhất trước | 2 entry `reminderAt` khác nhau | thứ tự tăng dần theo `reminderAt` |
| R-04 | `computeAlarms` sinh đúng tên và thời điểm | entry `id: 'a'`, `reminderAt: 5000` | `[{ name: 'reminder-a', when: 5000 }]` |
| R-05 | `computeAlarms` bỏ qua entry không có reminder tương lai | entry `reminderAt` quá khứ | mảng rỗng |
| R-06 | `snoozeUntil('15m', now)` | `now: 0` | `900000` (15×60×1000) |
| R-07 | `snoozeUntil('1h', now)` | `now: 0` | `3600000` |
| R-08 | `snoozeUntil('1d', now)` | `now: 0` | `86400000` |
| R-09 | `entryIdFromAlarmName` hợp lệ | `'reminder-abc'` | `'abc'` |
| R-10 | `entryIdFromAlarmName` không đúng tiền tố | `'khac-abc'` | `null` |
| R-11 | `notificationFor` tìm thấy entry | alarm name `'reminder-a'`, entry `id:'a', title:'Bài hay'` | `{ id:'a', title:'Reading Diary Reminder', message:'Xem lại: Bài hay' }` |
| R-12 | `notificationFor` không tìm thấy entry (đã xoá) | alarm name `'reminder-khong-ton-tai'` | `null` |

- [ ] **Step 2: DỪNG — chờ người dùng duyệt**

- [ ] **Step 3: Commit sau khi được duyệt**

```bash
git add docs/test-cases/unit/e3-reminders.md
git commit -m "test(E3): add unit test cases for reminders"
```

---

## Task 2: TDD `src/lib/reminders.ts`

**Files:**
- Create: `src/lib/reminders.ts`
- Test: `tests/unit/reminders.test.ts`

**Interfaces:**
- Consumes: `Entry` từ `src/lib/types.ts` (E1)
- Produces:
  - `function pendingReminders(entries: Entry[], now: number): Entry[]`
  - `type AlarmSpec = { name: string; when: number }`
  - `function computeAlarms(entries: Entry[], now: number): AlarmSpec[]`
  - `type SnoozeDuration = '15m' | '1h' | '1d'`
  - `function snoozeUntil(duration: SnoozeDuration, now: number): number`
  - `function entryIdFromAlarmName(alarmName: string): string | null`
  - `function notificationFor(entries: Entry[], alarmName: string): { id: string; title: string; message: string } | null`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/reminders.test.ts`:

```ts
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
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/reminders.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/reminders"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/lib/reminders.ts`:

```ts
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
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/reminders.test.ts`
Expected: PASS, 12 test.

- [ ] **Step 5: Chạy toàn bộ tầng unit**

Run: `npm run test:run`
Expected: PASS toàn bộ (84 cũ + 12 mới = 96).

- [ ] **Step 6: Commit**

```bash
git add src/lib/reminders.ts tests/unit/reminders.test.ts
git commit -m "feat(E3): add reminders lib for alarms, badge, snooze"
```

---

## Task 3: Viết test case tầng INTEGRATION cho E3 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/integration/e3-reminders.md`

**Interfaces:**
- Consumes: tầng unit đã xanh (Task 2)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 4–7

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `inte-tester` (Phase 1)**

Giao agent viết `docs/test-cases/integration/e3-reminders.md`, phủ:

**`src/background.ts` qua fake chrome mở rộng (`tests/integration/background.test.ts`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| BG-01 | `reconcile()` khi có entry với reminder tương lai | tạo đúng 1 alarm tên `reminder-{id}` |
| BG-02 | `reconcile()` xoá alarm cũ trước khi tạo lại | alarm cũ không đúng entry hiện tại bị `chrome.alarms.clear` |
| BG-03 | `reconcile()` cập nhật badge đúng số lượng pending | `chrome.action.setBadgeText` gọi với `{ text: '1' }` |
| BG-04 | `reconcile()` khi không có reminder nào | badge text rỗng `''` |
| BG-05 | `handleAlarm()` tạo notification đúng nội dung | `chrome.notifications.create` gọi với title/message đúng PRD |
| BG-06 | `handleAlarm()` với alarm không khớp entry nào | không gọi `chrome.notifications.create` |
| BG-07 | `handleNotificationClick()` mở tab đúng URL chứa entryId | `chrome.tabs.create` gọi với url chứa `?entryId={id}` |
| BG-08 | `handleNotificationClick()` xoá notification sau khi click | `chrome.notifications.clear` được gọi |

**`EntryForm` field reminder (`tests/integration/EntryFormReminder.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| ERM-01 | Nhập ngày giờ tương lai vào field Nhắc nhở rồi Lưu | `onSubmit` nhận `reminderAt` đúng epoch ms |
| ERM-02 | Bỏ trống field Nhắc nhở | `onSubmit` nhận `reminderAt: undefined` |
| ERM-03 | Chế độ sửa, entry có sẵn reminder | field điền sẵn đúng giá trị |

**`ReminderList` (`tests/integration/ReminderList.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| RL-01 | Không có reminder nào đang chờ | hiện thông báo trạng thái rỗng |
| RL-02 | Có reminder | hiện title + thời điểm |
| RL-03 | Click nút "+15 phút" | `onSnooze` gọi với id đúng và thời điểm mới = now+15 phút |
| RL-04 | Click title | `onSelect` gọi với đúng entry |

**`App` wiring tab + deep link (`tests/integration/AppReminders.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| AR-01 | Click tab "Nhắc nhở" | `ReminderList` hiện ra thay `EntryList` |
| AR-02 | URL có `?entryId={id}` khi mount | form tự mở ở chế độ sửa đúng entry đó |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/integration/e3-reminders.md
git commit -m "test(E3): add integration test cases for reminders"
```

---

## Task 4: Mở rộng `fakeChrome` + TDD `src/background.ts`

**Files:**
- Modify: `tests/helpers/fakeChrome.ts`
- Modify: `src/background.ts`
- Test: `tests/integration/background.test.ts`

**Interfaces:**
- Consumes: `chromeStorage`, `onEntriesChanged` (E1 `src/storage.ts`), `computeAlarms`/`notificationFor`/`pendingReminders` (Task 2)
- Produces:
  - `installFakeChrome` trả thêm: `alarms: Record<string, number>`, `notifications: Record<string, unknown>`, `badgeText(): string`, `triggerAlarm(name: string): void`, `triggerNotificationClick(id: string): void`, `createdTabs: { url: string }[]`
  - `src/background.ts` export: `reconcile(): Promise<void>`, `handleAlarm(alarm: { name: string }): Promise<void>`, `handleNotificationClick(notificationId: string): void`

- [ ] **Step 1: Mở rộng `tests/helpers/fakeChrome.ts`**

Thêm vào bên trong hàm `installFakeChrome`, sau khối `storage`/`onChanged` hiện có và trước dòng `vi.stubGlobal('chrome', fake)` — đọc file hiện tại trước để chèn đúng vị trí trong object `fake`:

```ts
const alarmsStore: Record<string, number> = {};
const alarmListeners: Array<(alarm: { name: string }) => void> = [];
const notificationsStore: Record<string, unknown> = {};
const notificationClickListeners: Array<(id: string) => void> = [];
const createdTabs: { url: string }[] = [];
let badgeText = '';
```

Thêm các khối sau vào object `fake` (cùng cấp với `storage`, `tabs`):

```ts
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
```

Cập nhật `tabs.query` giữ nguyên như cũ, thêm `create` vào cùng object `tabs`:

```ts
create: (opts: { url: string }) => {
  createdTabs.push(opts);
},
```

Cập nhật `return` cuối hàm, thêm các trường mới cạnh `store`/`failNextSave` đã có:

```ts
return {
  store,
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
```

- [ ] **Step 2: Viết test thất bại**

`tests/integration/background.test.ts`:

```ts
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
```

- [ ] **Step 3: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/background.test.ts`
Expected: FAIL — `src/background.ts` hiện tại chỉ có `export {};` rỗng, chưa export `reconcile`/`handleAlarm`/`handleNotificationClick`.

- [ ] **Step 4: Viết implementation tối thiểu**

`src/background.ts` (thay toàn bộ nội dung cũ):

```ts
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

chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.notifications.onClicked.addListener(handleNotificationClick);
onEntriesChanged(() => {
  void reconcile();
});
void reconcile();
```

Chạy top-level `void reconcile()` ngay khi module load — service worker MV3 chạy lại từ đầu mỗi khi được đánh thức, nên đây là điểm đồng bộ alarm/badge đáng tin cậy nhất, không cần đợi sự kiện `onStartup`/`onInstalled` riêng.

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/background.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 6: Chạy toàn bộ, xác nhận không có gì vỡ**

Run: `npm run test:run`
Expected: PASS toàn bộ (test cũ của `storage.test.tsx` E1 vẫn xanh — `fakeChrome.ts` chỉ được thêm trường mới, không đổi hành vi cũ).

- [ ] **Step 7: Commit**

```bash
git add tests/helpers/fakeChrome.ts src/background.ts tests/integration/background.test.ts
git commit -m "feat(E3): implement service worker alarms, notifications, and badge"
```

---

## Task 5: TDD field Nhắc nhở trong `EntryForm`

**Files:**
- Modify: `src/popup/EntryForm.tsx`
- Test: `tests/integration/EntryFormReminder.test.tsx`

**Interfaces:**
- Consumes: `Entry`, `EntryDraft` (E1 `types.ts`)
- Produces: `EntryForm` nhận và gửi `reminderAt` qua field `datetime-local` — không đổi props hiện có

- [ ] **Step 1: Viết test thất bại**

`tests/integration/EntryFormReminder.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import type { Entry } from '../../src/lib/types';

describe('EntryForm reminder field', () => {
  it('ERM-01: nhập ngày giờ tương lai rồi Lưu, onSubmit nhận đúng reminderAt', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.type(screen.getByLabelText('Nhắc nhở'), '2099-01-01T10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reminderAt: new Date('2099-01-01T10:00').getTime() }),
    );
  });

  it('ERM-02: bỏ trống field Nhắc nhở, onSubmit nhận reminderAt undefined', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reminderAt: undefined }));
  });

  it('ERM-03: chế độ sửa điền sẵn reminder có sẵn', () => {
    const existing: Entry = {
      id: 'id-1',
      title: 'Cũ',
      category: 'blog',
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
      reminderAt: new Date('2099-06-15T08:30').getTime(),
    };
    render(<EntryForm initial={existing} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Nhắc nhở')).toHaveValue('2099-06-15T08:30');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/EntryFormReminder.test.tsx`
Expected: FAIL — chưa có label "Nhắc nhở" trong `EntryForm`.

- [ ] **Step 3: Sửa `EntryForm.tsx`**

Thêm 2 hàm chuyển đổi thời gian ngay trên component (hoặc dưới import, trước `type Props`):

```tsx
function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
```

Thêm state cạnh các state khác:

```tsx
const [reminderAt, setReminderAt] = useState<string>(
  initial?.reminderAt ? toDatetimeLocal(initial.reminderAt) : '',
);
```

Trong `handleSubmit`, đổi dòng `reminderAt: initial?.reminderAt,` thành:

```tsx
reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
```

Khi tạo mới thành công, dọn thêm `reminderAt`:

```tsx
if (!initial) {
  setTitle('');
  setContent('');
  setTags([]);
  setReminderAt('');
}
```

Chèn field vào JSX, ngay sau `<TagInput>` (từ E2) và trước field "Nguồn" — dùng `Field` render-prop có sẵn:

```tsx
<Field label="Nhắc nhở" id="reminderAt" error={errors.reminderAt}>
  {(props) => (
    <input
      {...props}
      type="datetime-local"
      value={reminderAt}
      onChange={(e) => setReminderAt(e.target.value)}
      className="w-full rounded border px-2 py-1"
    />
  )}
</Field>
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/EntryFormReminder.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: Chạy toàn bộ, xác nhận không vỡ gì**

Run: `npm run test:run`
Expected: PASS toàn bộ (test `EntryForm.test.tsx`/`EntryFormTags.test.tsx` cũ vẫn xanh).

- [ ] **Step 6: Chạy build, xác nhận `tsc -b` sạch**

Run: `npm run build`
Expected: build xanh.

- [ ] **Step 7: Commit**

```bash
git add src/popup/EntryForm.tsx tests/integration/EntryFormReminder.test.tsx
git commit -m "feat(E3): add reminder datetime field to EntryForm"
```

---

## Task 6: TDD `ReminderList`

**Files:**
- Create: `src/popup/ReminderList.tsx`
- Test: `tests/integration/ReminderList.test.tsx`

**Interfaces:**
- Consumes: `Entry` (E1 `types.ts`), `pendingReminders`/`snoozeUntil` (Task 2)
- Produces: `function ReminderList(props: { entries: Entry[]; now?: () => number; onSnooze: (id: string, newReminderAt: number) => Promise<void>; onSelect: (entry: Entry) => void }): JSX.Element` — export có tên

- [ ] **Step 1: Viết test thất bại**

`tests/integration/ReminderList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderList } from '../../src/popup/ReminderList';
import type { Entry } from '../../src/lib/types';

const NOW = 1_700_000_000_000;

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'a',
    title: 'Bài hay',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    reminderAt: NOW + 60_000,
    ...overrides,
  };
}

describe('ReminderList', () => {
  it('RL-01: không có reminder nào thì hiện trạng thái rỗng', () => {
    render(<ReminderList entries={[]} now={() => NOW} onSnooze={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText('Không có nhắc nhở nào')).toBeInTheDocument();
  });

  it('RL-02: có reminder thì hiện title', () => {
    render(
      <ReminderList entries={[entry()]} now={() => NOW} onSnooze={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Bài hay')).toBeInTheDocument();
  });

  it('RL-03: click "+15 phút" gọi onSnooze đúng id và thời điểm mới', async () => {
    const onSnooze = vi.fn().mockResolvedValue(undefined);
    render(
      <ReminderList
        entries={[entry({ id: 'a' })]}
        now={() => NOW}
        onSnooze={onSnooze}
        onSelect={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '+15 phút' }));
    expect(onSnooze).toHaveBeenCalledWith('a', NOW + 15 * 60 * 1000);
  });

  it('RL-04: click title gọi onSelect với đúng entry', async () => {
    const onSelect = vi.fn();
    const e = entry();
    render(<ReminderList entries={[e]} now={() => NOW} onSnooze={vi.fn()} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Bài hay'));
    expect(onSelect).toHaveBeenCalledWith(e);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/ReminderList.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/popup/ReminderList"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/popup/ReminderList.tsx`:

```tsx
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
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/ReminderList.test.tsx`
Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```bash
git add src/popup/ReminderList.tsx tests/integration/ReminderList.test.tsx
git commit -m "feat(E3): add ReminderList with snooze actions"
```

---

## Task 7: Nối tab Nhắc nhở + deep link `?entryId=` vào `App`

**Files:**
- Modify: `src/popup/App.tsx`
- Test: `tests/integration/AppReminders.test.tsx`

**Interfaces:**
- Consumes: `ReminderList` (Task 6), `snoozeUntil` (Task 2, dùng gián tiếp qua `ReminderList`)
- Produces: `App` (default export, không đổi chữ ký)

- [ ] **Step 1: Viết test thất bại**

`tests/integration/AppReminders.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';
import App from '../../src/popup/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('App reminders tab', () => {
  it('AR-01: click tab Nhắc nhở thì hiện ReminderList thay EntryList', async () => {
    installFakeChrome({
      entries: [
        {
          id: '1',
          title: 'Có nhắc nhở',
          category: 'blog',
          tags: [],
          createdAt: 1000,
          updatedAt: 1000,
          reminderAt: Date.now() + 60_000,
        },
      ],
    });
    render(<App />);
    await screen.findByText('Có nhắc nhở');

    await userEvent.click(screen.getByRole('button', { name: 'Nhắc nhở' }));

    expect(screen.getByRole('button', { name: '+15 phút' })).toBeInTheDocument();
  });
});

describe('App deep link', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?entryId=1');
  });

  it('AR-02: URL có entryId thì mở form sửa đúng entry đó', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'Entry mục tiêu', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
        { id: '2', title: 'Entry khác', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
      ],
    });
    render(<App />);

    expect(await screen.findByLabelText('Tiêu đề')).toHaveValue('Entry mục tiêu');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/AppReminders.test.tsx`
Expected: FAIL — chưa có tab "Nhắc nhở", chưa đọc `?entryId=`.

- [ ] **Step 3: Sửa `App.tsx`**

Thêm import:

```tsx
import { ReminderList } from './ReminderList';
```

Thêm state view, cạnh state `filters` (từ E2):

```tsx
const [view, setView] = useState<'list' | 'reminders'>('list');
const [handledDeepLink, setHandledDeepLink] = useState(false);
```

Thêm effect đọc `?entryId=` sau effect `hydrate()` hiện có — chỉ chạy 1 lần khi entries có dữ liệu và chưa xử lý deep link:

```tsx
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
```

(`setEditing`/biến `entries` đọc đúng tên đã tồn tại trong `App` — đọc file hiện tại để dùng đúng tên state, không đổi tên.)

Thêm hàm `handleSnooze`, đặt cạnh các handler khác trong `App`:

```tsx
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
```

Thêm thanh tab vào JSX, ngay trên khối hiện đang render `<SearchBar>`/`<EntryList>`:

```tsx
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
```

Bọc khối `<SearchBar>` + `<EntryList>` hiện có trong điều kiện `view === 'list'`, và thêm nhánh `ReminderList` khi `view === 'reminders'`:

```tsx
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
```

(Đọc file hiện tại để giữ đúng các prop/tên biến đang có ở khối `<EntryList>` — chỉ bọc điều kiện, không đổi nội dung bên trong.)

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/AppReminders.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 5: Chạy toàn bộ tầng integration**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 6: Chạy build, xác nhận `tsc -b` sạch**

Run: `npm run build`
Expected: build xanh.

- [ ] **Step 7: Commit**

```bash
git add src/popup/App.tsx tests/integration/AppReminders.test.tsx
git commit -m "feat(E3): wire reminders tab and notification deep link into App"
```

---

## Task 8: Viết test case tầng E2E cho E3 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/e2e/e3-reminders.md`

**Interfaces:**
- Consumes: tầng integration đã xanh (Task 4–7)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 9

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `e2e-tester` (Phase 1)**

Giao agent viết `docs/test-cases/e2e/e3-reminders.md`. Chờ alarm thật bắn trong e2e không khả thi (phải chờ thời gian thật, dễ flaky) — kịch bản khói chỉ xác nhận badge cập nhật ngay sau khi lưu entry có reminder, đúng tinh thần "1 smoke mỗi epic, độ phủ hành vi nằm ở tầng dưới" (spec §5):

| ID | Kịch bản | Các bước | Kỳ vọng |
|---|---|---|---|
| E-03 | Đặt nhắc nhở thì thấy trong tab Nhắc nhở | 1. Mở popup<br>2. Tạo entry "Bài viết E2E Reminder", đặt Nhắc nhở ở 1 giờ sau<br>3. Lưu<br>4. Bấm tab "Nhắc nhở" | Sau bước 3 entry hiện trong tab Danh sách; sau bước 4 entry hiện trong tab Nhắc nhở kèm nút "+15 phút"/"+1 giờ"/"+1 ngày" |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/e2e/e3-reminders.md
git commit -m "test(E3): add e2e test case for reminders"
```

---

## Task 9: E2E smoke test và đóng epic E3

**Files:**
- Create: `tests/e2e/e3-reminders.spec.ts`

**Interfaces:**
- Consumes: `dist/` từ `npm run build`
- Produces: `npm run test:e2e` xanh cả 3 smoke (E-01, E-02, E-03); E3 hoàn tất

- [ ] **Step 1: Viết test thất bại**

`tests/e2e/e3-reminders.spec.ts`:

```ts
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e3-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('E-03: đặt nhắc nhở thì thấy trong tab Nhắc nhở', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E Reminder');
  await page.getByLabel('Phân loại').selectOption('blog');

  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const value = `${oneHourLater.getFullYear()}-${pad(oneHourLater.getMonth() + 1)}-${pad(oneHourLater.getDate())}T${pad(oneHourLater.getHours())}:${pad(oneHourLater.getMinutes())}`;
  await page.getByLabel('Nhắc nhở').fill(value);

  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Bài viết E2E Reminder')).toBeVisible();

  await page.getByRole('button', { name: 'Nhắc nhở' }).click();
  await expect(page.getByText('Bài viết E2E Reminder')).toBeVisible();
  await expect(page.getByRole('button', { name: '+15 phút' })).toBeVisible();
});
```

- [ ] **Step 2: Build và chạy, xác nhận XANH**

```bash
npm run test:e2e
```

Expected: PASS cả 3 test (E-01, E-02, E-03).

- [ ] **Step 3: Chạy toàn bộ 3 tầng lần cuối**

```bash
npm run test:run
npm run test:e2e
```

Expected: cả hai PASS.

- [ ] **Step 4: Commit đóng epic**

```bash
git add -A
git commit -m "feat(E3): complete reminders with alarms, notifications, badge, and snooze"
```

Không `git push` — controller xử lý merge sau khi review toàn nhánh xong.

---

## Các plan tiếp theo

| Plan | Epic | Nội dung |
|---|---|---|
| `<ngày>-e4-data-stats.md` | E4 | `lib/transfer.ts`, `lib/stats.ts`, options page với export/import JSON và bảng thống kê |
