# Reading Diary — E4 Data & Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Options page cho phép xuất toàn bộ entries ra file JSON, nhập lại từ file JSON (chọn Gộp hoặc Thay thế), và xem bảng thống kê (tổng số, số entry tuần này, top 5 category, top 5 tag, chuỗi ngày liên tục). Đây là epic cuối cùng — hoàn tất toàn bộ F1–F8.

**Architecture:** `src/lib/transfer.ts` (xuất/nhập JSON, validate shape, merge logic) và `src/lib/stats.ts` (tính thống kê) là hàm thuần trong `src/lib/**`, test không cần mock. `src/store/diaryStore.ts` (E1) được nối thêm action `setAll` để ghi đè toàn bộ mảng entries một lần (dùng cho cả Gộp và Thay thế — phần merge logic tính trước ở `lib/transfer.ts`, store chỉ ghi). `src/options/App.tsx` (vỏ rỗng từ E0) trở thành trang thật, dùng `useDiaryStore` giống `popup/App.tsx` (spec §3.3: mỗi context tự mount store riêng, đồng bộ qua `onEntriesChanged`).

**Tech Stack:** React 19, TypeScript, Vitest + RTL, Playwright. Xuất file dùng `Blob` + `URL.createObjectURL` + thẻ `<a download>` click lập trình — không cần quyền `downloads`, không gọi API ngoài.

**Spec:** `docs/superpowers/specs/2026-08-31-reading-diary-design.md`

## Global Constraints

- `src/lib/**` KHÔNG được import `chrome` hoặc `zustand`.
- Không thêm thư viện chart — biểu đồ top category/tag vẽ bằng thanh CSS thuần (spec §9).
- Chỉ export JSON, KHÔNG làm CSV (F7.2 đã cắt theo spec §9).
- KHÔNG làm heatmap (F8.3) hay tag cloud (F8.4) — đã cắt theo spec §9.
- UI viết cứng tiếng Việt. Không cài thư viện i18n.
- Không gọi API ngoài, không tracking, không analytics.
- Export format đúng PRD: `{ version: '1.0', exportedAt: <ISO string>, entries: Entry[] }`.
- Import phải validate shape trước khi áp dụng — sai định dạng thì từ chối, không đụng data cũ (spec §8).
- Import hợp lệ phải hỏi Merge (giữ cũ + thêm mới) hay Replace (xoá hết, thay bằng imported) trước khi ghi (spec §8, PRD F7.4).
- Quy trình test theo `CLAUDE.md`: tuần tự unit → integration → e2e. Không song song. Không sang tầng sau khi tầng trước chưa xanh.
- Trước mỗi tầng, agent tester viết test case markdown và phải dừng chờ duyệt trước khi viết test thật (test case doc gate).
- Commit sau mỗi task. Epic xanh cả 3 tầng thì commit `feat(E4): ...`.

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/lib/transfer.ts` | `toExportJSON`, `parseImport`, `mergeEntries`. Thuần. |
| `src/lib/stats.ts` | `computeStats`. Thuần. |
| `src/store/diaryStore.ts` | Modify: thêm action `setAll(entries): Promise<void>`. |
| `src/options/App.tsx` | Viết lại: khu Thống kê + khu Xuất + khu Nhập. |
| `tests/unit/transfer.test.ts` | Tầng unit |
| `tests/unit/stats.test.ts` | Tầng unit |
| `tests/unit/diaryStore.test.ts` | Modify: thêm test cho `setAll` |
| `tests/integration/optionsApp.test.tsx` | Tầng integration |
| `tests/e2e/e4-data-stats.spec.ts` | Tầng e2e |

---

## Task 1: Viết test case tầng UNIT cho E4 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/unit/e4-data-stats.md`

**Interfaces:**
- Consumes: `docs/PRD.md` F7/F8, spec §9 (phạm vi đã cắt)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 2, 3, 4

- [ ] **Step 1: Gọi agent `unit-tester` (Phase 1)**

Giao agent viết `docs/test-cases/unit/e4-data-stats.md`, phủ ba module.

**Module `src/lib/transfer.ts`:**

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| T-01 | `toExportJSON` đúng shape | 1 entry, `now` cố định | JSON parse ra có `version:'1.0'`, `exportedAt` là ISO string của `now`, `entries` khớp mảng đưa vào |
| T-02 | `parseImport` JSON hỏng | chuỗi `'khong-phai-json'` | `{ ok:false, error: ... }` |
| T-03 | `parseImport` không phải object | chuỗi `'123'` | `{ ok:false, error: ... }` |
| T-04 | `parseImport` thiếu mảng `entries` | `'{"version":"1.0"}'` | `{ ok:false, error: ... }` |
| T-05 | `parseImport` entry thiếu field bắt buộc | entries có phần tử thiếu `title` | `{ ok:false, error: ... }` |
| T-06 | `parseImport` hợp lệ | JSON đúng format từ `toExportJSON` | `{ ok:true, entries: [...] }` khớp |
| T-07 | `mergeEntries` giữ entry cũ, thêm entry mới | existing `[a]`, imported `[b]` | kết quả `[a, b]` |
| T-08 | `mergeEntries` bỏ qua id trùng | existing `[a]` (`id:'x'`), imported `[a2]` (`id:'x'` khác title) | kết quả chỉ có bản cũ `a`, không có `a2` |

**Module `src/lib/stats.ts`, hàm `computeStats(entries, now)`:**

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| S-01 | `total` đúng tổng số | 3 entry | `total: 3` |
| S-02 | `thisWeek` đếm đúng trong 7 ngày | 1 entry `createdAt: now - 3 ngày`, 1 entry `createdAt: now - 10 ngày` | `thisWeek: 1` |
| S-03 | `thisWeek` biên inclusive đúng 7 ngày trước | entry `createdAt: now - 7*24h` | có tính vào `thisWeek` |
| S-04 | `topCategories` sắp xếp giảm dần, tối đa 5 | 6 category khác nhau với số lượng khác nhau | mảng có 5 phần tử, phần tử đầu có `count` lớn nhất |
| S-05 | `topTags` sắp xếp giảm dần, tối đa 5 | 6 tag khác nhau | mảng có 5 phần tử, đúng thứ tự giảm dần |
| S-06 | `streak` = 0 khi không có entry hôm nay | entry `createdAt` là 2 ngày trước | `streak: 0` |
| S-07 | `streak` đếm đúng chuỗi ngày liên tục | entry hôm nay + hôm qua + hôm kia | `streak: 3` |
| S-08 | `streak` dừng khi có khoảng trống | entry hôm nay + 2 ngày trước (thiếu hôm qua) | `streak: 1` |

- [ ] **Step 2: DỪNG — chờ người dùng duyệt**

- [ ] **Step 3: Commit sau khi được duyệt**

```bash
git add docs/test-cases/unit/e4-data-stats.md
git commit -m "test(E4): add unit test cases for transfer and stats"
```

---

## Task 2: TDD `src/lib/transfer.ts`

**Files:**
- Create: `src/lib/transfer.ts`
- Test: `tests/unit/transfer.test.ts`

**Interfaces:**
- Consumes: `Entry` từ `src/lib/types.ts` (E1)
- Produces:
  - `function toExportJSON(entries: Entry[], now?: number): string`
  - `type ImportResult = { ok: true; entries: Entry[] } | { ok: false; error: string }`
  - `function parseImport(json: string): ImportResult`
  - `function mergeEntries(existing: Entry[], imported: Entry[]): Entry[]`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/transfer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toExportJSON, parseImport, mergeEntries } from '../../src/lib/transfer';
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

describe('toExportJSON', () => {
  it('T-01: đúng shape version/exportedAt/entries', () => {
    const now = 1_700_000_000_000;
    const json = toExportJSON([entry()], now);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBe(new Date(now).toISOString());
    expect(parsed.entries).toEqual([entry()]);
  });
});

describe('parseImport', () => {
  it('T-02: JSON hỏng thì trả lỗi', () => {
    const result = parseImport('khong-phai-json');
    expect(result.ok).toBe(false);
  });

  it('T-03: không phải object thì trả lỗi', () => {
    const result = parseImport('123');
    expect(result.ok).toBe(false);
  });

  it('T-04: thiếu mảng entries thì trả lỗi', () => {
    const result = parseImport('{"version":"1.0"}');
    expect(result.ok).toBe(false);
  });

  it('T-05: entry thiếu field bắt buộc thì trả lỗi', () => {
    const result = parseImport(
      JSON.stringify({ version: '1.0', entries: [{ id: 'a', category: 'blog' }] }),
    );
    expect(result.ok).toBe(false);
  });

  it('T-06: JSON hợp lệ thì trả entries khớp', () => {
    const json = toExportJSON([entry()], 1000);
    const result = parseImport(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entries).toEqual([entry()]);
  });
});

describe('mergeEntries', () => {
  it('T-07: giữ entry cũ, thêm entry mới', () => {
    const existing = [entry({ id: 'a' })];
    const imported = [entry({ id: 'b', title: 'Bài mới' })];
    const result = mergeEntries(existing, imported);
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('T-08: bỏ qua id trùng, giữ bản cũ', () => {
    const existing = [entry({ id: 'x', title: 'Bản cũ' })];
    const imported = [entry({ id: 'x', title: 'Bản mới' })];
    const result = mergeEntries(existing, imported);
    expect(result).toEqual([entry({ id: 'x', title: 'Bản cũ' })]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/transfer.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/transfer"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/lib/transfer.ts`:

```ts
import type { Entry } from './types';

const EXPORT_VERSION = '1.0';

export function toExportJSON(entries: Entry[], now: number = Date.now()): string {
  return JSON.stringify(
    { version: EXPORT_VERSION, exportedAt: new Date(now).toISOString(), entries },
    null,
    2,
  );
}

export type ImportResult = { ok: true; entries: Entry[] } | { ok: false; error: string };

export function parseImport(json: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ' };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Định dạng file không đúng' };
  }

  const entries = (data as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) {
    return { ok: false, error: 'File thiếu danh sách entries' };
  }

  for (const e of entries) {
    if (
      typeof e !== 'object' ||
      e === null ||
      typeof (e as Record<string, unknown>).id !== 'string' ||
      typeof (e as Record<string, unknown>).title !== 'string' ||
      typeof (e as Record<string, unknown>).category !== 'string'
    ) {
      return { ok: false, error: 'Có entry không đúng định dạng' };
    }
  }

  return { ok: true, entries: entries as Entry[] };
}

export function mergeEntries(existing: Entry[], imported: Entry[]): Entry[] {
  const existingIds = new Set(existing.map((e) => e.id));
  const newOnes = imported.filter((e) => !existingIds.has(e.id));
  return [...existing, ...newOnes];
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/transfer.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transfer.ts tests/unit/transfer.test.ts
git commit -m "feat(E4): add transfer lib for JSON export/import"
```

---

## Task 3: TDD `src/lib/stats.ts`

**Files:**
- Create: `src/lib/stats.ts`
- Test: `tests/unit/stats.test.ts`

**Interfaces:**
- Consumes: `Entry`, `Category` từ `src/lib/types.ts` (E1)
- Produces:
  - `type Stats = { total: number; thisWeek: number; topCategories: { category: Category; count: number }[]; topTags: { tag: string; count: number }[]; streak: number }`
  - `function computeStats(entries: Entry[], now?: number): Stats`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/lib/stats';
import type { Entry } from '../../src/lib/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: Math.random().toString(36),
    title: 'Bài',
    category: 'blog',
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('computeStats', () => {
  it('S-01: total đúng tổng số', () => {
    const stats = computeStats([entry(), entry(), entry()], NOW);
    expect(stats.total).toBe(3);
  });

  it('S-02: thisWeek đếm đúng trong 7 ngày', () => {
    const entries = [entry({ createdAt: NOW - 3 * DAY }), entry({ createdAt: NOW - 10 * DAY })];
    expect(computeStats(entries, NOW).thisWeek).toBe(1);
  });

  it('S-03: thisWeek biên inclusive đúng 7 ngày trước', () => {
    const entries = [entry({ createdAt: NOW - 7 * DAY })];
    expect(computeStats(entries, NOW).thisWeek).toBe(1);
  });

  it('S-04: topCategories sắp xếp giảm dần, tối đa 5', () => {
    const cats: Entry['category'][] = ['email', 'news', 'blog', 'social', 'other'];
    const entries = [
      ...Array.from({ length: 5 }, () => entry({ category: 'email' })),
      ...Array.from({ length: 3 }, () => entry({ category: 'news' })),
      ...cats.slice(2).map((c) => entry({ category: c })),
    ];
    const top = computeStats(entries, NOW).topCategories;
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top[0]).toEqual({ category: 'email', count: 5 });
  });

  it('S-05: topTags sắp xếp giảm dần, tối đa 5', () => {
    const built = [
      entry({ tags: ['popular'] }),
      entry({ tags: ['popular'] }),
      entry({ tags: ['popular'] }),
      entry({ tags: ['rare'] }),
      entry({ tags: ['t3'] }),
      entry({ tags: ['t4'] }),
      entry({ tags: ['t5'] }),
      entry({ tags: ['t6'] }),
    ];
    const top = computeStats(built, NOW).topTags;
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top[0]).toEqual({ tag: 'popular', count: 3 });
  });

  it('S-06: streak 0 khi không có entry hôm nay', () => {
    const entries = [entry({ createdAt: NOW - 2 * DAY })];
    expect(computeStats(entries, NOW).streak).toBe(0);
  });

  it('S-07: streak đếm đúng chuỗi ngày liên tục', () => {
    const entries = [
      entry({ createdAt: NOW }),
      entry({ createdAt: NOW - DAY }),
      entry({ createdAt: NOW - 2 * DAY }),
    ];
    expect(computeStats(entries, NOW).streak).toBe(3);
  });

  it('S-08: streak dừng khi có khoảng trống', () => {
    const entries = [entry({ createdAt: NOW }), entry({ createdAt: NOW - 2 * DAY })];
    expect(computeStats(entries, NOW).streak).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/stats.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/stats"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/lib/stats.ts`:

```ts
import type { Category, Entry } from './types';

export type Stats = {
  total: number;
  thisWeek: number;
  topCategories: { category: Category; count: number }[];
  topTags: { tag: string; count: number }[];
  streak: number;
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeStats(entries: Entry[], now: number = Date.now()): Stats {
  const total = entries.length;

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = entries.filter((e) => e.createdAt >= weekAgo).length;

  const categoryCounts = new Map<Category, number>();
  const tagCounts = new Map<string, number>();
  entries.forEach((e) => {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
    e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
  });

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const daysWithEntry = new Set(entries.map((e) => startOfDay(e.createdAt)));
  let streak = 0;
  let cursor = startOfDay(now);
  while (daysWithEntry.has(cursor)) {
    streak += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }

  return { total, thisWeek, topCategories, topTags, streak };
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/stats.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 5: Chạy toàn bộ tầng unit**

Run: `npm run test:run`
Expected: PASS toàn bộ (114 cũ + 8 transfer + 8 stats = 130).

- [ ] **Step 6: Commit**

```bash
git add src/lib/stats.ts tests/unit/stats.test.ts
git commit -m "feat(E4): add stats lib for summary, top category/tag, streak"
```

---

## Task 4: Viết test case tầng INTEGRATION cho E4 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/integration/e4-data-stats.md`

**Interfaces:**
- Consumes: tầng unit đã xanh (Task 2, 3)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 5, 6

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `inte-tester` (Phase 1)**

Giao agent viết `docs/test-cases/integration/e4-data-stats.md`, phủ:

**`diaryStore.setAll` (mở rộng `tests/unit/diaryStore.test.ts`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| U-S12 | `setAll` ghi đè toàn bộ entries | `entries` trong state và adapter khớp đúng mảng mới |
| U-S13 | `setAll` khi ghi lỗi thì hoàn nguyên | `entries` quay về như cũ, ném lỗi |

**`options/App.tsx` qua RTL + fake chrome (`tests/integration/optionsApp.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| OA-01 | Click "Xuất ra JSON" | `URL.createObjectURL` được gọi, thẻ `<a>` được click (tải xuống kích hoạt) |
| OA-02 | Chọn file JSON hợp lệ | Hiện số lượng entry tìm thấy trong file |
| OA-03 | Chọn file không hợp lệ | Hiện thông báo lỗi, không hiện lựa chọn Gộp/Thay thế |
| OA-04 | Click "Gộp" sau khi chọn file hợp lệ | Entries mới được thêm, entries cũ giữ nguyên |
| OA-05 | Click "Thay thế" sau khi chọn file hợp lệ | Entries cũ bị xoá, thay bằng entries trong file |
| OA-06 | Hiện đúng số liệu tổng/tuần này/chuỗi ngày | Số hiện đúng theo entries đang có |
| OA-07 | Hiện top category/tag | Tên category/tag đúng thứ tự nhiều nhất trước |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/integration/e4-data-stats.md
git commit -m "test(E4): add integration test cases for data transfer and stats"
```

---

## Task 5: TDD `diaryStore.setAll`

**Files:**
- Modify: `src/store/diaryStore.ts`
- Modify: `tests/unit/diaryStore.test.ts`

**Interfaces:**
- Consumes: `persist` nội bộ đã có trong `createDiaryStore` (E1)
- Produces: `setAll: (entries: Entry[]) => Promise<void>` thêm vào `DiaryState`

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `describe('diaryStore', ...)` trong `tests/unit/diaryStore.test.ts` (đọc file hiện tại để chèn đúng vị trí, giữ nguyên toàn bộ test cũ):

```ts
  it('U-S12: setAll ghi đè toàn bộ entries', async () => {
    const adapter = fakeAdapter([entry({ id: 'cu' })]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();

    const next = [entry({ id: 'moi-1' }), entry({ id: 'moi-2' })];
    await store.getState().setAll(next);

    expect(store.getState().entries.map((e) => e.id).sort()).toEqual(['moi-1', 'moi-2']);
    expect(adapter.peek().map((e) => e.id).sort()).toEqual(['moi-1', 'moi-2']);
  });

  it('U-S13: setAll khi ghi lỗi thì hoàn nguyên', async () => {
    const adapter = fakeAdapter([entry({ id: 'cu' })]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().setAll([entry({ id: 'moi' })])).rejects.toThrow();
    expect(store.getState().entries.map((e) => e.id)).toEqual(['cu']);
  });
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/diaryStore.test.ts`
Expected: FAIL — `store.getState().setAll is not a function`.

- [ ] **Step 3: Sửa `src/store/diaryStore.ts`**

Thêm vào `DiaryState` type, cạnh các action khác:

```ts
  setAll: (entries: Entry[]) => Promise<void>;
```

Thêm vào object trả về của `createDiaryStore`, cạnh `deleteEntry`:

```ts
      setAll: async (entries) => {
        await persist(sortNewestFirst(entries));
      },
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/diaryStore.test.ts`
Expected: PASS, 13 test (11 cũ + 2 mới).

- [ ] **Step 5: Chạy toàn bộ, xác nhận không vỡ gì**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add src/store/diaryStore.ts tests/unit/diaryStore.test.ts
git commit -m "feat(E4): add setAll action to diaryStore for import"
```

---

## Task 6: TDD `options/App.tsx`

**Files:**
- Modify: `src/options/App.tsx`
- Test: `tests/integration/optionsApp.test.tsx`

**Interfaces:**
- Consumes: `useDiaryStore` (E1, qua `src/store/diaryStore.ts`), `onEntriesChanged` (E1 `src/storage.ts`), `toExportJSON`/`parseImport`/`mergeEntries` (Task 2), `computeStats` (Task 3), `CATEGORIES` (E1 `types.ts`)
- Produces: `options/App.tsx` default export — không đổi entry point (`src/options/main.tsx` từ E0 vẫn render `<App />` y nguyên)

- [ ] **Step 1: Viết test thất bại**

`tests/integration/optionsApp.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';
import App from '../../src/options/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('options App export', () => {
  it('OA-01: click Xuất ra JSON tạo Blob URL và trigger tải xuống', async () => {
    installFakeChrome({ entries: [] });
    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Xuất ra JSON' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('options App import', () => {
  const validFile = () =>
    new File(
      [JSON.stringify({ version: '1.0', entries: [{ id: 'x', title: 'Nhập vào', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 }] })],
      'backup.json',
      { type: 'application/json' },
    );

  it('OA-02: chọn file hợp lệ hiện số lượng entry tìm thấy', async () => {
    installFakeChrome({ entries: [] });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    expect(await screen.findByText(/1 entry/)).toBeInTheDocument();
  });

  it('OA-03: chọn file hỏng hiện lỗi, không hiện lựa chọn Gộp/Thay thế', async () => {
    installFakeChrome({ entries: [] });
    render(<App />);
    const badFile = new File(['khong-phai-json'], 'bad.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), badFile);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gộp (giữ dữ liệu cũ)' })).not.toBeInTheDocument();
  });

  it('OA-04: click Gộp thêm entry mới, giữ entry cũ', async () => {
    installFakeChrome({
      entries: [{ id: 'cu', title: 'Bài cũ', category: 'blog', tags: [], createdAt: 500, updatedAt: 500 }],
    });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Gộp (giữ dữ liệu cũ)' }));

    expect(await screen.findByTestId('stat-total')).toHaveTextContent('2');
  });

  it('OA-05: click Thay thế xoá hết, thay bằng entries trong file', async () => {
    installFakeChrome({
      entries: [{ id: 'cu', title: 'Bài cũ', category: 'blog', tags: [], createdAt: 500, updatedAt: 500 }],
    });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Thay thế toàn bộ' }));

    expect(await screen.findByTestId('stat-total')).toHaveTextContent('1');
  });
});

describe('options App stats', () => {
  it('OA-06: hiện đúng số liệu tổng và chuỗi ngày', async () => {
    const now = Date.now();
    installFakeChrome({
      entries: [
        { id: '1', title: 'A', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '2', title: 'B', category: 'blog', tags: [], createdAt: now, updatedAt: now },
      ],
    });
    render(<App />);
    expect(await screen.findByTestId('stat-total')).toHaveTextContent('2');
  });

  it('OA-07: hiện top category theo đúng thứ tự nhiều nhất trước', async () => {
    const now = Date.now();
    installFakeChrome({
      entries: [
        { id: '1', title: 'A', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '2', title: 'B', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '3', title: 'C', category: 'news', tags: [], createdAt: now, updatedAt: now },
      ],
    });
    render(<App />);
    const list = await screen.findByTestId('top-categories');
    expect(list.textContent?.indexOf('Blog')).toBeLessThan(list.textContent?.indexOf('Tin tức') ?? -1);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/optionsApp.test.tsx`
Expected: FAIL — `options/App.tsx` hiện tại chỉ render `<h1>` tĩnh, không có button/input/testid nào.

- [ ] **Step 3: Viết implementation**

`src/options/App.tsx` (thay toàn bộ nội dung cũ):

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useDiaryStore } from '../store/diaryStore';
import { onEntriesChanged } from '../storage';
import { toExportJSON, parseImport, mergeEntries } from '../lib/transfer';
import { computeStats } from '../lib/stats';
import { CATEGORIES } from '../lib/types';
import type { Entry } from '../lib/types';

export default function App() {
  const entries = useDiaryStore((s) => s.entries);
  const hydrate = useDiaryStore((s) => s.hydrate);
  const setAll = useDiaryStore((s) => s.setAll);

  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Entry[] | null>(null);

  useEffect(() => {
    void hydrate();
    return onEntriesChanged(() => void hydrate());
  }, [hydrate]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const handleExport = () => {
    const json = toExportJSON(entries);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `reading-diary-export-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok) {
      setImportError(result.error);
      setPendingImport(null);
      return;
    }
    setImportError(null);
    setPendingImport(result.entries);
  };

  const applyMerge = async () => {
    if (!pendingImport) return;
    await setAll(mergeEntries(entries, pendingImport));
    setPendingImport(null);
  };

  const applyReplace = async () => {
    if (!pendingImport) return;
    await setAll(pendingImport);
    setPendingImport(null);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Reading Diary — Cài đặt</h1>

      <section className="mt-6">
        <h2 className="font-medium">Thống kê</h2>
        <p data-testid="stat-total">Tổng số: {stats.total}</p>
        <p data-testid="stat-week">Tuần này: {stats.thisWeek}</p>
        <p data-testid="stat-streak">Chuỗi ngày liên tục: {stats.streak}</p>

        <h3 className="mt-3 text-sm font-medium">Phân loại nhiều nhất</h3>
        <div data-testid="top-categories">
          {stats.topCategories.map((c) => (
            <div key={c.category} className="flex items-center gap-2">
              <span className="w-24 text-sm">
                {CATEGORIES.find((x) => x.value === c.category)?.label}
              </span>
              <div className="h-2 bg-blue-500" style={{ width: `${c.count * 12}px` }} />
              <span className="text-xs">{c.count}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-3 text-sm font-medium">Thẻ nhiều nhất</h3>
        <div data-testid="top-tags">
          {stats.topTags.map((t) => (
            <div key={t.tag} className="flex items-center gap-2">
              <span className="w-24 text-sm">{t.tag}</span>
              <div className="h-2 bg-emerald-500" style={{ width: `${t.count * 12}px` }} />
              <span className="text-xs">{t.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Xuất dữ liệu</h2>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-blue-600 px-3 py-1 text-white"
        >
          Xuất ra JSON
        </button>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Nhập dữ liệu</h2>
        <input
          aria-label="Chọn file nhập"
          type="file"
          accept=".json"
          onChange={handleFileChange}
        />
        {importError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {importError}
          </p>
        )}
        {pendingImport && (
          <div className="mt-2">
            <p className="text-sm">Tìm thấy {pendingImport.length} entry trong file.</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={applyMerge}
                className="rounded bg-slate-200 px-3 py-1 text-sm"
              >
                Gộp (giữ dữ liệu cũ)
              </button>
              <button
                type="button"
                onClick={applyReplace}
                className="rounded bg-red-100 px-3 py-1 text-sm"
              >
                Thay thế toàn bộ
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/optionsApp.test.tsx`
Expected: PASS, 7 test.

- [ ] **Step 5: Chạy toàn bộ tầng integration**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 6: Chạy build, xác nhận `tsc -b` sạch**

Run: `npm run build`
Expected: build xanh.

- [ ] **Step 7: Commit**

```bash
git add src/options/App.tsx tests/integration/optionsApp.test.tsx
git commit -m "feat(E4): implement options page export/import/stats"
```

---

## Task 7: Viết test case tầng E2E cho E4 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/e2e/e4-data-stats.md`

**Interfaces:**
- Consumes: tầng integration đã xanh (Task 5, 6)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 8

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `e2e-tester` (Phase 1)**

Giao agent viết `docs/test-cases/e2e/e4-data-stats.md`. Kịch bản khói cho toàn bộ epic cuối cùng, xác nhận extension chạy thật trong Chrome — độ phủ chi tiết nằm ở tầng dưới:

| ID | Kịch bản | Các bước | Kỳ vọng |
|---|---|---|---|
| E-04 | Tạo entry rồi xuất ra file JSON đúng nội dung | 1. Mở popup, tạo entry "Bài viết E2E Export"<br>2. Lưu<br>3. Mở trang options<br>4. Bấm "Xuất ra JSON" | Sau bước 2 entry hiện trong popup; sau bước 4 trình duyệt tải xuống 1 file, tên file chứa `reading-diary-export-`, nội dung file là JSON hợp lệ chứa entry "Bài viết E2E Export" |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/e2e/e4-data-stats.md
git commit -m "test(E4): add e2e test case for export"
```

---

## Task 8: E2E smoke test và đóng epic E4 — hoàn tất toàn bộ F1–F8

**Files:**
- Create: `tests/e2e/e4-data-stats.spec.ts`

**Interfaces:**
- Consumes: `dist/` từ `npm run build`
- Produces: `npm run test:e2e` xanh cả 4 smoke (E-01, E-02, E-03, E-04); E4 hoàn tất; toàn bộ F1–F8 hoàn tất

- [ ] **Step 1: Viết test thất bại**

`tests/e2e/e4-data-stats.spec.ts`:

```ts
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e4-'));
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

test('E-04: tạo entry rồi xuất ra file JSON đúng nội dung', async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await popup.getByLabel('Tiêu đề').fill('Bài viết E2E Export');
  await popup.getByLabel('Phân loại').selectOption('blog');
  await popup.getByRole('button', { name: 'Lưu' }).click();
  await expect(popup.getByText('Bài viết E2E Export')).toBeVisible();

  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  const [download] = await Promise.all([
    optionsPage.waitForEvent('download'),
    optionsPage.getByRole('button', { name: 'Xuất ra JSON' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain('reading-diary-export-');

  const filePath = await download.path();
  const content = fs.readFileSync(filePath as string, 'utf-8');
  const parsed = JSON.parse(content);
  expect(parsed.version).toBe('1.0');
  expect(parsed.entries.some((e: { title: string }) => e.title === 'Bài viết E2E Export')).toBe(
    true,
  );
});
```

- [ ] **Step 2: Build và chạy, xác nhận XANH**

```bash
npm run test:e2e
```

Expected: PASS cả 4 test (E-01, E-02, E-03, E-04).

- [ ] **Step 3: Chạy toàn bộ 3 tầng lần cuối**

```bash
npm run test:run
npm run test:e2e
```

Expected: cả hai PASS.

- [ ] **Step 4: Commit đóng epic**

```bash
git add -A
git commit -m "feat(E4): complete data export/import and stats dashboard"
```

Không `git push` — controller xử lý merge sau khi review toàn nhánh xong.

---

## Hoàn tất dự án

Sau Task 8, toàn bộ F1–F8 (trừ các mục P2 đã cắt theo spec §9) đã hoàn tất: quick capture, CRUD, category, tags, search/filter, reminders, data export/import, stats dashboard. Không còn epic nào tiếp theo.
