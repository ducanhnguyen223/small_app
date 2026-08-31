# Reading Diary — E2 Tags + Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm gắn thẻ (tags) thật cho entry và tìm kiếm/lọc entry theo text, category, tag, khoảng ngày — kết hợp nhiều điều kiện cùng lúc, có highlight từ khớp.

**Architecture:** `filterEntries` và `highlightMatches` là hàm thuần trong `src/lib/**` (không import chrome/zustand), test không cần mock. `TagInput` (dùng lại trong `EntryForm`) và `SearchBar` là component React nhận props điều khiển từ ngoài (controlled), không tự giữ nguồn sự thật. `App.tsx` giữ state `filters`, tính `filterEntries(entries, filters)` trước khi truyền cho `EntryList`.

**Tech Stack:** React 19, TypeScript, Vitest + RTL (dùng `vi.useFakeTimers()` cho debounce), Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-reading-diary-design.md`

## Global Constraints

- `src/lib/**` KHÔNG được import `chrome` hoặc `zustand`.
- UI viết cứng tiếng Việt. Không cài thư viện i18n.
- Không thêm thư viện chart, không thêm thư viện mock Chrome API.
- Không gọi API ngoài, không tracking, không analytics.
- Quy trình test theo `CLAUDE.md`: tuần tự unit → integration → e2e. Không song song. Không sang tầng sau khi tầng trước chưa xanh.
- Trước mỗi tầng, agent tester viết test case markdown và phải dừng chờ duyệt trước khi viết test thật (test case doc gate).
- Tags: tối đa 10, mỗi tag tối đa 30 ký tự (đã enforce ở `validateEntry`, E1) — `TagInput` chỉ là UI, không lặp lại validation, form vẫn chạy `validateEntry` khi submit.
- Debounce search 300ms (PRD F5, spec §6 E2).
- Filter kết hợp bằng AND giữa các nhóm (text AND category AND tags AND khoảng ngày); trong nhóm tags dùng OR (PRD F5.3, spec §4 `Filters`).
- Commit sau mỗi task. Epic xanh cả 3 tầng thì commit `feat(E2): ...`.

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/lib/filter.ts` | `filterEntries(entries, filters)`. Thuần. |
| `src/lib/highlight.ts` | `highlightMatches(text, query)` — tách text thành đoạn khớp/không khớp cho F5.6. Thuần. |
| `src/popup/TagInput.tsx` | Chip input: Enter/comma thêm tag, click X xoá, autocomplete sau 2 ký tự. |
| `src/popup/SearchBar.tsx` | Text search (debounce 300ms) + lọc category + lọc tag + khoảng ngày (preset + tuỳ chỉnh). |
| `src/popup/EntryForm.tsx` | Modify: thay `tags: initial?.tags ?? []` cứng bằng `TagInput` thật, thêm prop `allTags?: string[]`. |
| `src/popup/EntryList.tsx` | Modify: thêm prop `highlightQuery?: string`, highlight khớp trong title bằng `<mark>`. |
| `src/popup/App.tsx` | Modify: giữ state `filters`, tính `allTags` từ `entries`, render `SearchBar` trên `EntryList`, áp `filterEntries` trước khi truyền entries cho `EntryList`. |
| `tests/unit/filter.test.ts` | Tầng unit |
| `tests/unit/highlight.test.ts` | Tầng unit |
| `tests/integration/TagInput.test.tsx` | Tầng integration |
| `tests/integration/SearchBar.test.tsx` | Tầng integration |
| `tests/integration/EntryFormTags.test.tsx` | Tầng integration (wiring TagInput+EntryForm, highlight+EntryList) |
| `tests/integration/AppSearch.test.tsx` | Tầng integration (wiring SearchBar+filterEntries+App) |
| `tests/e2e/e2-tags-search.spec.ts` | Tầng e2e |

---

## Task 1: Viết test case tầng UNIT cho E2 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/unit/e2-tags-search.md`

**Interfaces:**
- Consumes: `docs/PRD.md` F4/F5, spec §4 (`Filters` type)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 2, 3

- [ ] **Step 1: Gọi agent `unit-tester` (Phase 1)**

Giao agent viết `docs/test-cases/unit/e2-tags-search.md`, phủ hai module.

**Module `src/lib/filter.ts`, hàm `filterEntries(entries, filters)`:**

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| F-01 | Filters rỗng | `{}` | trả về toàn bộ entries, nguyên thứ tự |
| F-02 | Text khớp title | `{ text: 'react' }`, entry title chứa "React Hooks" | entry có mặt trong kết quả (không phân biệt hoa thường) |
| F-03 | Text không khớp title lẫn content | `{ text: 'khong-co' }` | entry bị loại |
| F-04 | Category khớp | `{ category: 'blog' }` | chỉ giữ entry category blog |
| F-05 | Category không khớp | `{ category: 'news' }`, entry category blog | entry bị loại |
| F-06 | Tags OR — khớp 1 trong nhiều tag filter | `{ tags: ['a','b'] }`, entry có tag `b` | entry có mặt |
| F-07 | Tags không khớp tag nào | `{ tags: ['x'] }`, entry tags `['a']` | entry bị loại |
| F-08 | Khoảng ngày inclusive | `{ from: 1000, to: 2000 }`, entry `createdAt: 1000` và entry khác `createdAt: 2000` | cả hai đều giữ (biên inclusive) |
| F-09 | Kết hợp nhiều filter (AND) | `{ text: 'react', category: 'blog' }`, 1 entry khớp cả hai, 1 entry chỉ khớp text | chỉ entry khớp cả hai có mặt |

**Module `src/lib/highlight.ts`, hàm `highlightMatches(text, query)`:**

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| H-01 | Query rỗng | `highlightMatches('Hello', '')` | `[{ text: 'Hello', match: false }]` |
| H-02 | Query không xuất hiện | `highlightMatches('Hello', 'zzz')` | `[{ text: 'Hello', match: false }]` |
| H-03 | Query khớp giữa text | `highlightMatches('Hello World', 'lo Wo')` | 3 đoạn: `'Hel'` (false), `'lo Wo'` (true), `'rld'` (false) |
| H-04 | Query khớp nhiều lần | `highlightMatches('ab ab', 'ab')` | 3 đoạn: `'ab'`(true), `' '`(false), `'ab'`(true) |
| H-05 | Text rỗng | `highlightMatches('', 'abc')` | `[]` |

- [ ] **Step 2: DỪNG — chờ người dùng duyệt**

Trình bày file test case cho người dùng. **Không viết một dòng test thật nào cho tới khi người dùng nói duyệt.**

- [ ] **Step 3: Commit sau khi được duyệt**

```bash
git add docs/test-cases/unit/e2-tags-search.md
git commit -m "test(E2): add unit test cases for tags and search"
```

---

## Task 2: TDD `src/lib/filter.ts`

**Files:**
- Create: `src/lib/filter.ts`
- Test: `tests/unit/filter.test.ts`

**Interfaces:**
- Consumes: `Entry`, `Filters` từ `src/lib/types.ts` (E1, đã có)
- Produces: `function filterEntries(entries: Entry[], filters: Filters): Entry[]`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterEntries } from '../../src/lib/filter';
import type { Entry } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id-1',
    title: 'React Hooks cơ bản',
    category: 'blog',
    content: 'Bài viết về useState và useEffect',
    tags: ['react'],
    createdAt: 1500,
    updatedAt: 1500,
    ...overrides,
  };
}

describe('filterEntries', () => {
  it('F-01: filters rỗng trả về toàn bộ', () => {
    const entries = [entry({ id: 'a' }), entry({ id: 'b' })];
    expect(filterEntries(entries, {})).toHaveLength(2);
  });

  it('F-02: text khớp title không phân biệt hoa thường', () => {
    const entries = [entry({ title: 'React Hooks' })];
    expect(filterEntries(entries, { text: 'react' })).toHaveLength(1);
  });

  it('F-03: text không khớp title lẫn content thì loại', () => {
    const entries = [entry({ title: 'React Hooks', content: 'useState' })];
    expect(filterEntries(entries, { text: 'khong-co' })).toHaveLength(0);
  });

  it('F-04: category khớp thì giữ', () => {
    const entries = [entry({ category: 'blog' })];
    expect(filterEntries(entries, { category: 'blog' })).toHaveLength(1);
  });

  it('F-05: category không khớp thì loại', () => {
    const entries = [entry({ category: 'blog' })];
    expect(filterEntries(entries, { category: 'news' })).toHaveLength(0);
  });

  it('F-06: tags OR — khớp 1 trong nhiều tag filter thì giữ', () => {
    const entries = [entry({ tags: ['b'] })];
    expect(filterEntries(entries, { tags: ['a', 'b'] })).toHaveLength(1);
  });

  it('F-07: tags không khớp tag nào thì loại', () => {
    const entries = [entry({ tags: ['a'] })];
    expect(filterEntries(entries, { tags: ['x'] })).toHaveLength(0);
  });

  it('F-08: khoảng ngày inclusive ở cả hai biên', () => {
    const entries = [entry({ id: 'a', createdAt: 1000 }), entry({ id: 'b', createdAt: 2000 })];
    const result = filterEntries(entries, { from: 1000, to: 2000 });
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('F-09: kết hợp nhiều filter dùng AND', () => {
    const entries = [
      entry({ id: 'match', title: 'React Hooks', category: 'blog' }),
      entry({ id: 'partial', title: 'React Hooks', category: 'news' }),
    ];
    const result = filterEntries(entries, { text: 'react', category: 'blog' });
    expect(result.map((e) => e.id)).toEqual(['match']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/filter.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/filter"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/lib/filter.ts`:

```ts
import type { Entry, Filters } from './types';

export function filterEntries(entries: Entry[], filters: Filters): Entry[] {
  return entries.filter((entry) => matchesFilters(entry, filters));
}

function matchesFilters(entry: Entry, filters: Filters): boolean {
  if (filters.category && entry.category !== filters.category) return false;

  if (filters.tags && filters.tags.length > 0) {
    const hasAnyTag = filters.tags.some((tag) => entry.tags.includes(tag));
    if (!hasAnyTag) return false;
  }

  if (filters.from !== undefined && entry.createdAt < filters.from) return false;
  if (filters.to !== undefined && entry.createdAt > filters.to) return false;

  if (filters.text) {
    const needle = filters.text.trim().toLowerCase();
    if (needle) {
      const haystack = `${entry.title} ${entry.content ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
  }

  return true;
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/filter.test.ts`
Expected: PASS, 9 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts tests/unit/filter.test.ts
git commit -m "feat(E2): add filterEntries for search and filter"
```

---

## Task 3: TDD `src/lib/highlight.ts`

**Files:**
- Create: `src/lib/highlight.ts`
- Test: `tests/unit/highlight.test.ts`

**Interfaces:**
- Consumes: không (hàm độc lập, chỉ nhận string)
- Produces:
  - `type HighlightSegment = { text: string; match: boolean }`
  - `function highlightMatches(text: string, query: string): HighlightSegment[]`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/highlight.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { highlightMatches } from '../../src/lib/highlight';

describe('highlightMatches', () => {
  it('H-01: query rỗng trả nguyên text, match false', () => {
    expect(highlightMatches('Hello', '')).toEqual([{ text: 'Hello', match: false }]);
  });

  it('H-02: query không xuất hiện trả nguyên text, match false', () => {
    expect(highlightMatches('Hello', 'zzz')).toEqual([{ text: 'Hello', match: false }]);
  });

  it('H-03: query khớp giữa text tách thành 3 đoạn', () => {
    expect(highlightMatches('Hello World', 'lo Wo')).toEqual([
      { text: 'Hel', match: false },
      { text: 'lo Wo', match: true },
      { text: 'rld', match: false },
    ]);
  });

  it('H-04: query khớp nhiều lần', () => {
    expect(highlightMatches('ab ab', 'ab')).toEqual([
      { text: 'ab', match: true },
      { text: ' ', match: false },
      { text: 'ab', match: true },
    ]);
  });

  it('H-05: text rỗng trả mảng rỗng', () => {
    expect(highlightMatches('', 'abc')).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/highlight.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/highlight"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/lib/highlight.ts`:

```ts
export type HighlightSegment = { text: string; match: boolean };

export function highlightMatches(text: string, query: string): HighlightSegment[] {
  const needle = query.trim();
  if (!needle || !text) {
    return text ? [{ text, match: false }] : [];
  }

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerNeedle, cursor);
    if (index === -1) {
      segments.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) segments.push({ text: text.slice(cursor, index), match: false });
    segments.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }

  return segments;
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/highlight.test.ts`
Expected: PASS, 5 test.

- [ ] **Step 5: Chạy toàn bộ tầng unit**

Run: `npm run test:run`
Expected: PASS toàn bộ (53 cũ + 9 filter + 5 highlight = 67).

- [ ] **Step 6: Commit**

```bash
git add src/lib/highlight.ts tests/unit/highlight.test.ts
git commit -m "feat(E2): add highlightMatches for search result highlighting"
```

---

## Task 4: Viết test case tầng INTEGRATION cho E2 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/integration/e2-tags-search.md`

**Interfaces:**
- Consumes: tầng unit đã xanh (Task 2, 3)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 5–8

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `inte-tester` (Phase 1)**

Giao agent viết `docs/test-cases/integration/e2-tags-search.md`, phủ:

**`TagInput` qua RTL:**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| TI-01 | Gõ text rồi Enter | tag mới xuất hiện dạng chip, input rỗng lại |
| TI-02 | Gõ text rồi dấu phẩy | tag mới được thêm |
| TI-03 | Click nút xoá trên chip | tag biến mất |
| TI-04 | Gõ trùng tag đã có rồi Enter | không thêm tag trùng, input rỗng lại |
| TI-05 | Gõ 2 ký tự khớp gợi ý, click gợi ý | tag từ gợi ý được thêm, input rỗng lại |

**`SearchBar` qua RTL (dùng fake timers cho debounce):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| SB-01 | Gõ text, đợi 300ms | `onFiltersChange` được gọi với `{ text: ... }` |
| SB-02 | Gõ text, mới 100ms | `onFiltersChange` CHƯA được gọi |
| SB-03 | Chọn category | `onFiltersChange` gọi với `{ category: ... }` sau debounce |
| SB-04 | Click chọn 1 tag trong danh sách `allTags` | `onFiltersChange` gọi với `{ tags: [tag] }` |
| SB-05 | Chọn preset "7 ngày gần nhất" | `onFiltersChange` gọi với `from` là mốc 7 ngày trước |

**Wiring `EntryForm` + `TagInput`, `EntryList` + highlight (`tests/integration/EntryFormTags.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| W-01 | Gõ tag qua `TagInput` trong `EntryForm` rồi Lưu | `onSubmit` nhận draft có `tags` chứa tag vừa gõ |
| W-02 | `EntryList` nhận prop `highlightQuery` khớp 1 phần title | phần khớp nằm trong `<mark>` |
| W-03 | `EntryList` không có `highlightQuery` | không có `<mark>` nào trong DOM |

**Wiring `App` + `SearchBar` + `filterEntries` (`tests/integration/AppSearch.test.tsx`):**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| A-01 | Có 2 entry khác title, gõ text khớp 1 entry, đợi debounce | `EntryList` chỉ còn hiện entry khớp |
| A-02 | Xoá hết text tìm kiếm | `EntryList` hiện lại toàn bộ entries |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

**Không viết test thật cho tới khi người dùng duyệt.**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/integration/e2-tags-search.md
git commit -m "test(E2): add integration test cases for tags and search"
```

---

## Task 5: TDD `TagInput`

**Files:**
- Create: `src/popup/TagInput.tsx`
- Test: `tests/integration/TagInput.test.tsx`

**Interfaces:**
- Consumes: không (component độc lập)
- Produces: `function TagInput(props: { tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[] }): JSX.Element` — export có tên

- [ ] **Step 1: Viết test thất bại**

`tests/integration/TagInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from '../../src/popup/TagInput';

describe('TagInput', () => {
  it('TI-01: gõ text rồi Enter thêm tag, input rỗng lại', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByLabelText('Thêm thẻ');
    await userEvent.type(input, 'react{Enter}');

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('TI-02: gõ text rồi dấu phẩy thêm tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react,');

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('TI-03: click nút xoá trên chip xoá tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['react', 'vue']} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Xoá thẻ react'));

    expect(onChange).toHaveBeenCalledWith(['vue']);
  });

  it('TI-04: gõ trùng tag đã có thì không thêm trùng', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['react']} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('TI-05: gõ 2 ký tự khớp gợi ý, click gợi ý thêm tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} suggestions={['react', 'redux']} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 're');
    await userEvent.click(screen.getByRole('option', { name: 'react' }));

    expect(onChange).toHaveBeenCalledWith(['react']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/TagInput.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/popup/TagInput"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/popup/TagInput.tsx`:

```tsx
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
};

export function TagInput({ tags, onChange, suggestions = [] }: Props) {
  const [input, setInput] = useState('');

  const commit = (raw: string) => {
    const tag = raw.trim();
    setInput('');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(input);
    }
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const trimmed = input.trim();
  const matches =
    trimmed.length >= 2
      ? suggestions.filter(
          (s) => s.toLowerCase().includes(trimmed.toLowerCase()) && !tags.includes(s),
        )
      : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-sm"
          >
            {tag}
            <button
              type="button"
              aria-label={`Xoá thẻ ${tag}`}
              onClick={() => remove(tag)}
              className="text-slate-500 hover:text-slate-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label="Thêm thẻ"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Gõ rồi Enter hoặc dấu phẩy"
        className="w-full rounded border px-2 py-1 text-sm"
      />
      {matches.length > 0 && (
        <ul role="listbox" aria-label="Gợi ý thẻ" className="rounded border bg-white text-sm shadow">
          {matches.map((m) => (
            <li key={m} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => commit(m)}
                className="w-full px-2 py-1 text-left hover:bg-slate-100"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`commit` reset `input` trước khi kiểm tra hợp lệ — nếu không, tag trùng hoặc chuỗi rỗng sẽ để lại chữ thừa trong ô nhập (test TI-04 kiểm tra hành vi này gián tiếp qua việc `onChange` không được gọi, còn input rỗng lại là hệ quả tất yếu của thứ tự này).

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/TagInput.test.tsx`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
git add src/popup/TagInput.tsx tests/integration/TagInput.test.tsx
git commit -m "feat(E2): add TagInput with autocomplete"
```

---

## Task 6: TDD `SearchBar`

**Files:**
- Create: `src/popup/SearchBar.tsx`
- Test: `tests/integration/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category`, `Filters` từ `src/lib/types.ts` (E1)
- Produces: `function SearchBar(props: { onFiltersChange: (filters: Filters) => void; allTags: string[] }): JSX.Element` — export có tên

- [ ] **Step 1: Viết test thất bại**

`tests/integration/SearchBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../src/popup/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SB-01: gõ text, đợi 300ms thì gọi onFiltersChange', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.type(screen.getByLabelText('Tìm kiếm'), 'react');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: 'react' }),
    );
  });

  it('SB-02: gõ text, mới 100ms thì chưa gọi', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.type(screen.getByLabelText('Tìm kiếm'), 'r');
    vi.advanceTimersByTime(100);

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('SB-03: chọn category thì gọi onFiltersChange sau debounce', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.selectOptions(screen.getByLabelText('Lọc phân loại'), 'blog');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'blog' }),
    );
  });

  it('SB-04: click chọn 1 tag thì gọi onFiltersChange với tags', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={['react', 'vue']} />);

    await user.click(screen.getByRole('button', { name: 'react' }));
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: ['react'] }),
    );
  });

  it('SB-05: chọn preset "7 ngày gần nhất" thì gọi onFiltersChange với from', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '7d');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: expect.any(Number) }),
    );
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/SearchBar.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/popup/SearchBar"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/popup/SearchBar.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Filters } from '../lib/types';

type Props = {
  onFiltersChange: (filters: Filters) => void;
  allTags: string[];
};

type Preset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function presetRange(preset: Preset, now: number): { from?: number; to?: number } {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now) };
    case '7d':
      return { from: now - 7 * 24 * 60 * 60 * 1000 };
    case '30d':
      return { from: now - 30 * 24 * 60 * 60 * 1000 };
    case 'month': {
      const d = new Date(now);
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    }
    default:
      return {};
  }
}

export function SearchBar({ onFiltersChange, allTags }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const range =
        preset === 'custom'
          ? {
              from: customFrom ? new Date(customFrom).getTime() : undefined,
              to: customTo ? new Date(customTo).getTime() : undefined,
            }
          : presetRange(preset, Date.now());

      onFiltersChange({
        text: text.trim() || undefined,
        category: category || undefined,
        tags: activeTags.length > 0 ? activeTags : undefined,
        ...range,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, category, activeTags, preset, customFrom, customTo, onFiltersChange]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <input
        aria-label="Tìm kiếm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm theo tiêu đề hoặc nội dung"
        className="w-full rounded border px-2 py-1"
      />

      <select
        aria-label="Lọc phân loại"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category | '')}
        className="w-full rounded border px-2 py-1"
      >
        <option value="">Tất cả phân loại</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-sm ${
                activeTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <select
        aria-label="Khoảng thời gian"
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        className="w-full rounded border px-2 py-1"
      >
        <option value="all">Mọi lúc</option>
        <option value="today">Hôm nay</option>
        <option value="7d">7 ngày gần nhất</option>
        <option value="30d">30 ngày gần nhất</option>
        <option value="month">Tháng này</option>
        <option value="custom">Tuỳ chỉnh</option>
      </select>

      {preset === 'custom' && (
        <div className="flex gap-2">
          <input
            aria-label="Từ ngày"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            aria-label="Đến ngày"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/SearchBar.test.tsx`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
git add src/popup/SearchBar.tsx tests/integration/SearchBar.test.tsx
git commit -m "feat(E2): add SearchBar with debounced text/category/tag/date filters"
```

---

## Task 7: Nối `TagInput` vào `EntryForm`, nối highlight vào `EntryList`

**Files:**
- Modify: `src/popup/EntryForm.tsx`
- Modify: `src/popup/EntryList.tsx`
- Test: `tests/integration/EntryFormTags.test.tsx`

**Interfaces:**
- Consumes: `TagInput` (Task 5), `highlightMatches`/`HighlightSegment` (Task 3)
- Produces:
  - `EntryForm` props mới: `allTags?: string[]` (giữ nguyên các props cũ)
  - `EntryList` props mới: `highlightQuery?: string` (giữ nguyên các props cũ)

- [ ] **Step 1: Viết test thất bại**

`tests/integration/EntryFormTags.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import { EntryList } from '../../src/popup/EntryList';
import type { Entry } from '../../src/lib/types';

describe('EntryForm + TagInput wiring', () => {
  it('W-01: gõ tag qua TagInput rồi Lưu, onSubmit nhận đúng tags', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['react'] }));
  });
});

describe('EntryList + highlight wiring', () => {
  const entries: Entry[] = [
    {
      id: 'id-1',
      title: 'React Hooks cơ bản',
      category: 'blog',
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('W-02: có highlightQuery khớp title thì bọc <mark>', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} highlightQuery="Hooks" />);
    const mark = document.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('Hooks');
  });

  it('W-03: không có highlightQuery thì không có <mark>', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(document.querySelector('mark')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/EntryFormTags.test.tsx`
Expected: FAIL — `EntryForm` chưa có `TagInput`, submit vẫn gửi `tags: initial?.tags ?? []` rỗng bất kể đã gõ; `EntryList` chưa nhận `highlightQuery`.

- [ ] **Step 3: Sửa `EntryForm.tsx`**

Thêm import:

```tsx
import { TagInput } from './TagInput';
```

Thêm prop `allTags` vào `Props`:

```tsx
type Props = {
  initial?: Entry;
  defaultUrl?: string;
  allTags?: string[];
  onSubmit: (draft: EntryDraft) => Promise<void>;
  onCancel?: () => void;
};
```

Cập nhật chữ ký hàm để nhận `allTags`:

```tsx
export function EntryForm({ initial, defaultUrl, allTags = [], onSubmit, onCancel }: Props) {
```

Thêm state `tags` cạnh các state khác:

```tsx
const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
```

Trong `handleSubmit`, đổi dòng `tags: initial?.tags ?? [],` thành `tags,`.

Sau khi lưu thành công khi tạo mới (`if (!initial) { setTitle(''); setContent(''); }`), thêm dọn tags:

```tsx
if (!initial) {
  setTitle('');
  setContent('');
  setTags([]);
}
```

Chèn `<TagInput tags={tags} onChange={setTags} suggestions={allTags} />` vào JSX, ngay sau khối `Field` "Ghi chú" và trước khối "Nguồn" (hoặc vị trí tương đương hợp lý trong form hiện có — đọc file trước khi sửa để giữ đúng cấu trúc `<form>` hiện tại).

- [ ] **Step 4: Sửa `EntryList.tsx`**

Thêm import:

```tsx
import { highlightMatches } from '../lib/highlight';
```

Thêm prop `highlightQuery` vào `Props`:

```tsx
type Props = {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => Promise<void>;
  highlightQuery?: string;
};
```

Cập nhật chữ ký hàm để nhận `highlightQuery`:

```tsx
export function EntryList({ entries, onEdit, onDelete, highlightQuery }: Props) {
```

Thêm hàm render title có highlight (đặt ngay trong file, phía trên hoặc dưới component `EntryList`):

```tsx
function HighlightedTitle({ title, query }: { title: string; query?: string }) {
  if (!query) return <>{title}</>;
  return (
    <>
      {highlightMatches(title, query).map((seg, i) =>
        seg.match ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}
```

Thay chỗ hiện đang render `{entry.title}` (trong mỗi `<li>`) bằng `<HighlightedTitle title={entry.title} query={highlightQuery} />` — đọc file trước để tìm đúng vị trí, giữ nguyên mọi thứ khác (badge category, nút Sửa/Xoá, modal xác nhận).

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/EntryFormTags.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 6: Chạy toàn bộ, xác nhận không có gì vỡ**

Run: `npm run test:run`
Expected: PASS toàn bộ (test cũ của `EntryForm.test.tsx`/`EntryList.test.tsx`/`popupApp.test.tsx` từ E1 vẫn phải xanh — props mới đều optional nên không phá test cũ).

- [ ] **Step 7: Commit**

```bash
git add src/popup/EntryForm.tsx src/popup/EntryList.tsx tests/integration/EntryFormTags.test.tsx
git commit -m "feat(E2): wire TagInput into EntryForm and highlight into EntryList"
```

---

## Task 8: Nối `SearchBar` + `filterEntries` vào `App`

**Files:**
- Modify: `src/popup/App.tsx`
- Test: `tests/integration/AppSearch.test.tsx`

**Interfaces:**
- Consumes: `SearchBar` (Task 6), `filterEntries` (Task 2), `Filters` (E1 `types.ts`)
- Produces: `App` (default export, không đổi chữ ký — không nhận props)

- [ ] **Step 1: Viết test thất bại**

`tests/integration/AppSearch.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';
import App from '../../src/popup/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App + SearchBar wiring', () => {
  it('A-01: gõ text khớp 1 entry thì EntryList chỉ còn entry đó', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'React Hooks', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
        { id: '2', title: 'Vue Composition', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
      ],
    });
    render(<App />);

    expect(await screen.findByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('Vue Composition')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Tìm kiếm'), 'React');
    await new Promise((r) => setTimeout(r, 350));

    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.queryByText('Vue Composition')).not.toBeInTheDocument();
  });

  it('A-02: xoá hết text tìm kiếm thì hiện lại toàn bộ', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'React Hooks', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
        { id: '2', title: 'Vue Composition', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
      ],
    });
    render(<App />);
    await screen.findByText('React Hooks');

    const search = screen.getByLabelText('Tìm kiếm');
    await userEvent.type(search, 'React');
    await new Promise((r) => setTimeout(r, 350));
    await userEvent.clear(search);
    await new Promise((r) => setTimeout(r, 350));

    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('Vue Composition')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/AppSearch.test.tsx`
Expected: FAIL — chưa có `SearchBar`/label "Tìm kiếm" trong `App`, `EntryList` luôn hiện toàn bộ entries chưa lọc.

- [ ] **Step 3: Sửa `App.tsx`**

Thêm import:

```tsx
import { SearchBar } from './SearchBar';
import { filterEntries } from '../lib/filter';
import type { Filters } from '../lib/types';
```

Thêm `useMemo` vào import React hiện có nếu chưa có (`import { useEffect, useMemo, useState } from 'react';` — đọc file để xem import hiện tại và bổ sung `useMemo`/`useState` nếu thiếu).

Thêm state filters, ngay cạnh các state hiện có của `App`:

```tsx
const [filters, setFilters] = useState<Filters>({});
```

Tính `allTags` và `visibleEntries` bằng `useMemo`, đặt trước phần `return`:

```tsx
const allTags = useMemo(() => {
  const set = new Set<string>();
  entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}, [entries]);

const visibleEntries = useMemo(() => filterEntries(entries, filters), [entries, filters]);
```

(`entries` ở đây là biến đã lấy từ `useDiaryStore` trong `App` hiện tại — đọc file để dùng đúng tên biến đang tồn tại, không đổi tên.)

Chèn `<SearchBar onFiltersChange={setFilters} allTags={allTags} />` vào JSX ngay TRÊN `<EntryList ... />` hiện có.

Đổi `entries={entries}` truyền cho `EntryList` thành `entries={visibleEntries}`, và thêm `highlightQuery={filters.text}`.

Truyền `allTags={allTags}` cho `EntryForm` ở những chỗ `App` đang render nó (chế độ tạo mới và chế độ sửa — cả hai, đọc file để tìm đúng vị trí `<EntryForm ... />`).

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/AppSearch.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 5: Chạy toàn bộ tầng integration**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add src/popup/App.tsx tests/integration/AppSearch.test.tsx
git commit -m "feat(E2): wire SearchBar and filterEntries into popup App"
```

---

## Task 9: Viết test case tầng E2E cho E2 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/e2e/e2-tags-search.md`

**Interfaces:**
- Consumes: tầng integration đã xanh (Task 5–8)
- Produces: tài liệu test case được duyệt, đầu vào cho Task 10

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ.

- [ ] **Step 2: Gọi agent `e2e-tester` (Phase 1)**

Giao agent viết `docs/test-cases/e2e/e2-tags-search.md`. Một kịch bản khói bao phủ cả tag lẫn search — độ phủ chi tiết nằm ở tầng dưới:

| ID | Kịch bản | Các bước | Kỳ vọng |
|---|---|---|---|
| E-02 | Gắn tag rồi tìm lại bằng search | 1. Mở popup<br>2. Tạo entry "Bài viết E2E Search" với tag "smoke"<br>3. Lưu<br>4. Gõ "Search" vào ô tìm kiếm<br>5. Đợi debounce | Sau bước 3 entry hiện trong danh sách; sau bước 5 vẫn hiện (khớp từ khoá); gõ từ khoá không khớp thì entry biến mất khỏi danh sách |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/e2e/e2-tags-search.md
git commit -m "test(E2): add e2e test case for tags and search"
```

---

## Task 10: E2E smoke test và đóng epic E2

**Files:**
- Create: `tests/e2e/e2-tags-search.spec.ts`

**Interfaces:**
- Consumes: `dist/` từ `npm run build`
- Produces: `npm run test:e2e` xanh cả smoke E1 lẫn E2; E2 hoàn tất

- [ ] **Step 1: Viết test thất bại**

`tests/e2e/e2-tags-search.spec.ts`:

```ts
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e2-'));
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

test('E-02: gắn tag rồi tìm lại bằng search', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E Search');
  await page.getByLabel('Phân loại').selectOption('blog');
  await page.getByLabel('Thêm thẻ').fill('smoke');
  await page.getByLabel('Thêm thẻ').press('Enter');
  await page.getByRole('button', { name: 'Lưu' }).click();

  await expect(page.getByText('Bài viết E2E Search')).toBeVisible();

  await page.getByLabel('Tìm kiếm').fill('Search');
  await page.waitForTimeout(400);
  await expect(page.getByText('Bài viết E2E Search')).toBeVisible();

  await page.getByLabel('Tìm kiếm').fill('khong-ton-tai');
  await page.waitForTimeout(400);
  await expect(page.getByText('Bài viết E2E Search')).not.toBeVisible();
});
```

- [ ] **Step 2: Build và chạy, xác nhận XANH**

```bash
npm run test:e2e
```

Expected: PASS cả 2 test (E-01 từ E1, E-02 từ E2).

- [ ] **Step 3: Chạy toàn bộ 3 tầng lần cuối**

```bash
npm run test:run
npm run test:e2e
```

Expected: cả hai PASS.

- [ ] **Step 4: Commit đóng epic**

```bash
git add -A
git commit -m "feat(E2): complete tags and search with highlight and date filters"
```

Không `git push` — controller xử lý merge sau khi review toàn nhánh xong (đúng ruling đã áp dụng ở E1 Task 12).

---

## Các plan tiếp theo

| Plan | Epic | Nội dung |
|---|---|---|
| `<ngày>-e3-reminders.md` | E3 | `chrome.alarms`, `chrome.notifications`, badge đếm, danh sách nhắc, snooze |
| `<ngày>-e4-data-stats.md` | E4 | `lib/transfer.ts`, `lib/stats.ts`, options page với export/import JSON và bảng thống kê |
