# Reading Diary — E0 Scaffold + E1 Entry Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng Chrome Extension MV3 chạy được, nhấn `Ctrl/Cmd+Shift+D` mở popup với URL tab hiện tại điền sẵn, tạo/sửa/xoá entry có validation và phân loại, dữ liệu còn nguyên sau khi đóng mở lại.

**Architecture:** Logic thuần nằm trong `src/lib/**` (cấm import `chrome`, cấm import `zustand`) nên unit test chạy không cần mock. Zustand store nhận storage adapter qua tham số, nên unit test dùng adapter in-memory còn production dùng adapter bọc `chrome.storage.local`. Service worker không giữ state.

**Tech Stack:** Vite, `@crxjs/vite-plugin`, React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, Vitest + React Testing Library + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-reading-diary-design.md`

## Global Constraints

- Manifest V3. Chrome 120+.
- Permissions đúng 4 cái, không hơn: `storage`, `alarms`, `notifications`, `activeTab`. Không `host_permissions`, không `tabs`.
- `src/lib/**` KHÔNG được import `chrome` hoặc `zustand`. Vi phạm là phá tầng đáy kim tự tháp test.
- Lưu trữ: đúng một key `entries` trong `chrome.storage.local`, giá trị là `Entry[]`.
- Không gọi API ngoài, không tracking, không analytics.
- UI viết cứng tiếng Việt. Không cài thư viện i18n.
- Không thêm thư viện chart, không thêm thư viện mock Chrome API.
- Quy trình test theo `CLAUDE.md`: tuần tự unit → integration → e2e. Không bao giờ chạy song song. Không sang tầng sau khi tầng trước chưa xanh.
- Trước mỗi tầng, agent tester viết test case markdown và **phải dừng chờ người dùng duyệt** trước khi viết test thật.
- Ràng buộc validation (từ PRD §4.2): title bắt buộc 1–200 ký tự; category bắt buộc; content tối đa 5000; tối đa 10 tag, mỗi tag tối đa 30 ký tự; sourceUrl phải là URL hợp lệ; reminderAt phải ở tương lai.
- Commit sau mỗi task. Epic xanh cả 3 tầng thì commit `feat(E1): ...`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `manifest.json` | Khai báo MV3: popup, options page, service worker, permissions, phím tắt |
| `vite.config.ts` | Vite + React + Tailwind + CRXJS |
| `vitest.config.ts` | Vitest jsdom, setup file, loại trừ thư mục e2e |
| `playwright.config.ts` | Cấu hình e2e chạy extension unpacked |
| `src/lib/types.ts` | `Category`, `CATEGORIES`, `Entry`, `EntryDraft`, `ValidationErrors`, `StorageAdapter`. Thuần. |
| `src/lib/validation.ts` | `validateEntry()`. Thuần, nhận `now` qua tham số. |
| `src/store/diaryStore.ts` | `createDiaryStore(adapter, newId, now)`. Zustand, adapter tiêm từ ngoài. |
| `src/storage.ts` | `chromeStorage` adapter + `onEntriesChanged()`. Chỗ duy nhất chạm `chrome.storage`. |
| `src/popup/index.html` `main.tsx` `App.tsx` | Vỏ popup + nối store + lấy URL tab hiện tại |
| `src/popup/EntryForm.tsx` | Form tạo/sửa, hiện lỗi inline |
| `src/popup/EntryList.tsx` | Danh sách mới nhất trước, nút sửa/xoá, modal xác nhận xoá |
| `src/options/index.html` `main.tsx` `App.tsx` | Vỏ options page (E4 mới dùng thật) |
| `src/background.ts` | Service worker (E3 mới dùng thật) |
| `tests/helpers/fakeChrome.ts` | Fake `chrome` cho tầng integration |
| `tests/unit/*.test.ts` | Tầng unit |
| `tests/integration/*.test.tsx` | Tầng integration |
| `tests/e2e/*.spec.ts` | Tầng e2e |

---

## Task 1: Scaffold dự án và load được vào Chrome

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `manifest.json`, `index.css`
- Create: `src/popup/index.html`, `src/popup/main.tsx`, `src/popup/App.tsx`
- Create: `src/options/index.html`, `src/options/main.tsx`, `src/options/App.tsx`
- Create: `src/background.ts`, `src/vite-env.d.ts`

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces: dự án Vite build được ra `dist/`; `npm run dev`, `npm run build` chạy được

- [ ] **Step 1: Tạo dự án Vite React TypeScript**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Nếu thư mục không rỗng, Vite sẽ hỏi — chọn "Ignore files and continue".

- [ ] **Step 2: Cài dependency**

```bash
npm install zustand
npm install -D @crxjs/vite-plugin @tailwindcss/vite tailwindcss
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D @playwright/test @types/chrome
npx playwright install chromium
```

- [ ] **Step 3: Viết `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Reading Diary",
  "version": "0.1.0",
  "description": "Ghi nhật ký đọc bằng phím tắt",
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "Reading Diary"
  },
  "options_page": "src/options/index.html",
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  "permissions": ["storage", "alarms", "notifications", "activeTab"],
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+D",
        "mac": "Command+Shift+D"
      },
      "description": "Mở Reading Diary"
    }
  }
}
```

`_execute_action` là lệnh dựng sẵn của Chrome để mở popup — không cần viết code cho F1.1/F1.2. Người dùng đổi phím tắt tại `chrome://extensions/shortcuts`.

- [ ] **Step 4: Viết `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
      },
    },
  },
});
```

- [ ] **Step 5: Viết `index.css` (Tailwind v4)**

```css
@import "tailwindcss";
```

Tailwind v4 không dùng `tailwind.config.js` và không dùng PostCSS. Nếu thấy file `tailwind.config.js` hay `postcss.config.js` do template sinh ra, xoá đi.

- [ ] **Step 6: Viết vỏ popup**

`src/popup/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Reading Diary</title>
  </head>
  <body class="w-[400px] h-[600px]">
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/popup/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/popup/App.tsx`:

```tsx
export default function App() {
  return <h1 className="p-4 text-lg font-semibold">Reading Diary</h1>;
}
```

- [ ] **Step 7: Viết vỏ options page**

`src/options/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Reading Diary — Cài đặt</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/options/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/options/App.tsx`:

```tsx
export default function App() {
  return <h1 className="p-6 text-xl font-semibold">Reading Diary — Cài đặt</h1>;
}
```

- [ ] **Step 8: Viết `src/background.ts` rỗng có chủ đích**

```ts
// Service worker. E3 sẽ dùng cho chrome.alarms + chrome.notifications.
// Hiện chưa có việc gì — giữ file để manifest trỏ tới hợp lệ.
export {};
```

- [ ] **Step 9: Thêm npm scripts vào `package.json`**

Đặt khối `scripts` thành đúng như sau (tên script khớp `CLAUDE.md`):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 10: Build và kiểm tra bằng mắt trong Chrome**

```bash
npm run build
```

Kỳ vọng: build xanh, sinh `dist/` chứa `manifest.json`, `src/popup/index.html`, `src/options/index.html`.

Rồi mở `chrome://extensions`, bật Developer mode, bấm "Load unpacked", chọn thư mục `dist/`. Kỳ vọng: extension hiện trong danh sách, không báo lỗi đỏ. Bấm icon → popup hiện chữ "Reading Diary". Nhấn `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) → popup mở.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(E0): scaffold MV3 extension with Vite, React, Tailwind, CRXJS"
```

---

## Task 2: Hạ tầng test

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/helpers/fakeChrome.ts`, `playwright.config.ts`
- Create: `tests/unit/smoke.test.ts`
- Modify: `tsconfig.json` (thêm `types` cho vitest và chrome)

**Interfaces:**
- Consumes: dự án từ Task 1
- Produces: `npm run test:run` chạy được; `installFakeChrome(initial?: Record<string, unknown>): { store: Record<string, unknown>; failNextSave: () => void }` dùng cho tầng integration

- [ ] **Step 1: Viết `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
  },
});
```

Cấu hình Vitest tách khỏi `vite.config.ts` để plugin CRXJS không chạy khi test — CRXJS cần bối cảnh extension thật, sẽ làm hỏng test runner.

- [ ] **Step 2: Viết `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Viết `tests/helpers/fakeChrome.ts`**

```ts
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
```

- [ ] **Step 4: Viết `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    headless: false,
  },
});
```

Extension unpacked không chạy an toàn khi song song — vì vậy `workers: 1`, `headless: false`.

- [ ] **Step 5: Sửa `tsconfig.json`**

Thêm vào `compilerOptions` và `include`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "chrome", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 6: Viết test khói chứng minh hạ tầng chạy**

`tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('hạ tầng test', () => {
  it('chạy được Vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Chạy test**

Run: `npm run test:run`
Expected: PASS, 1 test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(E0): add Vitest, RTL, Playwright test infrastructure"
```

---

## Task 3: Viết test case tầng UNIT cho E1 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/unit/e1-entry-core.md`

**Interfaces:**
- Consumes: `docs/PRD.md` §4.2 (F2 validation rules), spec §4 (data model)
- Produces: tài liệu test case được duyệt, làm đầu vào cho Task 4 và Task 5

- [ ] **Step 1: Gọi agent `unit-tester` (Phase 1)**

Giao agent viết `docs/test-cases/unit/e1-entry-core.md`, phủ hai module.

**Module `src/lib/validation.ts`, hàm `validateEntry(draft, now)`:**

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| U-V01 | Draft hợp lệ | title `'Bài hay'`, category `'blog'`, tags `[]` | `{}` |
| U-V02 | Title rỗng | title `''` | `errors.title` = `'Tiêu đề không được để trống'` |
| U-V03 | Title chỉ khoảng trắng | title `'   '` | `errors.title` = `'Tiêu đề không được để trống'` |
| U-V04 | Title đúng 200 ký tự | title `'a'.repeat(200)` | không có `errors.title` |
| U-V05 | Title 201 ký tự | title `'a'.repeat(201)` | `errors.title` = `'Tiêu đề tối đa 200 ký tự'` |
| U-V06 | Category không hợp lệ | category `'random'` | `errors.category` = `'Phải chọn phân loại'` |
| U-V07 | Content đúng 5000 ký tự | content `'a'.repeat(5000)` | không có `errors.content` |
| U-V08 | Content 5001 ký tự | content `'a'.repeat(5001)` | `errors.content` = `'Nội dung tối đa 5000 ký tự'` |
| U-V09 | Đúng 10 tag | 10 tag hợp lệ | không có `errors.tags` |
| U-V10 | 11 tag | 11 tag | `errors.tags` = `'Tối đa 10 thẻ'` |
| U-V11 | Tag 31 ký tự | `['a'.repeat(31)]` | `errors.tags` = `'Mỗi thẻ tối đa 30 ký tự'` |
| U-V12 | sourceUrl hợp lệ | `'https://a.com/x'` | không có `errors.sourceUrl` |
| U-V13 | sourceUrl rác | `'khong-phai-url'` | `errors.sourceUrl` = `'URL không hợp lệ'` |
| U-V14 | sourceUrl khác http/https | `'ftp://a.com'` | `errors.sourceUrl` = `'URL không hợp lệ'` |
| U-V15 | reminderAt tương lai | `now + 1000` | không có `errors.reminderAt` |
| U-V16 | reminderAt quá khứ | `now - 1000` | `errors.reminderAt` = `'Thời điểm nhắc phải ở tương lai'` |
| U-V17 | Nhiều lỗi cùng lúc | title rỗng + category sai | cả `errors.title` và `errors.category` |

**Module `src/store/diaryStore.ts`** — dùng adapter in-memory:

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| U-S01 | `hydrate()` đọc entry từ adapter | `entries` khớp nội dung adapter |
| U-S02 | `hydrate()` sắp xếp mới nhất trước | `entries[0].createdAt` lớn nhất |
| U-S03 | `hydrate()` khi adapter lỗi | `error` khác null, `entries` vẫn rỗng |
| U-S04 | `addEntry()` gán id, createdAt, updatedAt | entry mới có đủ 3 field |
| U-S05 | `addEntry()` ghi xuống adapter | adapter chứa entry mới |
| U-S06 | `addEntry()` đặt entry mới lên đầu | `entries[0]` là entry vừa thêm |
| U-S07 | `addEntry()` khi ghi lỗi | ném lỗi, `entries` quay về như cũ, `error` khác null |
| U-S08 | `updateEntry()` đổi field và bơm `updatedAt` | field đổi, `createdAt` giữ nguyên |
| U-S09 | `updateEntry()` với id không tồn tại | `entries` không đổi |
| U-S10 | `deleteEntry()` xoá đúng entry | entry biến mất khỏi cả state lẫn adapter |
| U-S11 | `deleteEntry()` khi ghi lỗi | `entries` quay về như cũ |

- [ ] **Step 2: DỪNG — chờ người dùng duyệt**

Trình bày file test case cho người dùng. **Không viết một dòng test thật nào cho tới khi người dùng nói duyệt.** Nếu người dùng yêu cầu sửa, sửa rồi trình bày lại.

- [ ] **Step 3: Commit sau khi được duyệt**

```bash
git add docs/test-cases/unit/e1-entry-core.md
git commit -m "test(E1): add unit test cases for entry core"
```

---

## Task 4: TDD `src/lib/types.ts` + `src/lib/validation.ts`

**Files:**
- Create: `src/lib/types.ts`, `src/lib/validation.ts`
- Test: `tests/unit/validation.test.ts`

**Interfaces:**
- Consumes: test case U-V01…U-V17 đã duyệt ở Task 3
- Produces:
  - `type Category = 'email' | 'news' | 'blog' | 'social' | 'other'`
  - `const CATEGORIES: { value: Category; label: string; icon: string }[]`
  - `type Entry = { id: string; title: string; category: Category; content?: string; tags: string[]; sourceUrl?: string; reminderAt?: number; createdAt: number; updatedAt: number }`
  - `type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>`
  - `type ValidationErrors = Partial<Record<keyof EntryDraft, string>>`
  - `type StorageAdapter = { load(): Promise<Entry[]>; save(entries: Entry[]): Promise<void> }`
  - `function validateEntry(draft: EntryDraft, now?: number): ValidationErrors`

- [ ] **Step 1: Viết `src/lib/types.ts`**

Đây là khai báo kiểu thuần, không có logic nên không có test riêng — nó được test gián tiếp qua mọi test sau.

```ts
export type Category = 'email' | 'news' | 'blog' | 'social' | 'other';

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'news', label: 'Tin tức', icon: '📰' },
  { value: 'blog', label: 'Blog', icon: '📝' },
  { value: 'social', label: 'Mạng xã hội', icon: '💬' },
  { value: 'other', label: 'Khác', icon: '📌' },
];

export type Entry = {
  id: string;
  title: string;
  category: Category;
  content?: string;
  tags: string[];
  sourceUrl?: string;
  reminderAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;

export type ValidationErrors = Partial<Record<keyof EntryDraft, string>>;

export type StorageAdapter = {
  load(): Promise<Entry[]>;
  save(entries: Entry[]): Promise<void>;
};
```

- [ ] **Step 2: Viết test thất bại**

`tests/unit/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateEntry } from '../../src/lib/validation';
import type { EntryDraft } from '../../src/lib/types';

const NOW = 1_700_000_000_000;

function draft(overrides: Partial<EntryDraft> = {}): EntryDraft {
  return { title: 'Bài hay', category: 'blog', tags: [], ...overrides };
}

describe('validateEntry', () => {
  it('U-V01: draft hợp lệ không có lỗi', () => {
    expect(validateEntry(draft(), NOW)).toEqual({});
  });

  it.each([
    ['U-V02 title rỗng', { title: '' }, 'title', 'Tiêu đề không được để trống'],
    ['U-V03 title toàn khoảng trắng', { title: '   ' }, 'title', 'Tiêu đề không được để trống'],
    ['U-V05 title 201 ký tự', { title: 'a'.repeat(201) }, 'title', 'Tiêu đề tối đa 200 ký tự'],
    ['U-V06 category sai', { category: 'random' as never }, 'category', 'Phải chọn phân loại'],
    ['U-V08 content 5001 ký tự', { content: 'a'.repeat(5001) }, 'content', 'Nội dung tối đa 5000 ký tự'],
    ['U-V10 11 thẻ', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }, 'tags', 'Tối đa 10 thẻ'],
    ['U-V11 thẻ 31 ký tự', { tags: ['a'.repeat(31)] }, 'tags', 'Mỗi thẻ tối đa 30 ký tự'],
    ['U-V13 url rác', { sourceUrl: 'khong-phai-url' }, 'sourceUrl', 'URL không hợp lệ'],
    ['U-V14 url ftp', { sourceUrl: 'ftp://a.com' }, 'sourceUrl', 'URL không hợp lệ'],
    ['U-V16 nhắc trong quá khứ', { reminderAt: NOW - 1000 }, 'reminderAt', 'Thời điểm nhắc phải ở tương lai'],
  ])('%s', (_name, overrides, field, message) => {
    const errors = validateEntry(draft(overrides as Partial<EntryDraft>), NOW);
    expect(errors[field as keyof typeof errors]).toBe(message);
  });

  it.each([
    ['U-V04 title đúng 200 ký tự', { title: 'a'.repeat(200) }, 'title'],
    ['U-V07 content đúng 5000 ký tự', { content: 'a'.repeat(5000) }, 'content'],
    ['U-V09 đúng 10 thẻ', { tags: Array.from({ length: 10 }, (_, i) => `t${i}`) }, 'tags'],
    ['U-V12 url hợp lệ', { sourceUrl: 'https://a.com/x' }, 'sourceUrl'],
    ['U-V15 nhắc ở tương lai', { reminderAt: NOW + 1000 }, 'reminderAt'],
  ])('%s: không báo lỗi ở biên', (_name, overrides, field) => {
    const errors = validateEntry(draft(overrides as Partial<EntryDraft>), NOW);
    expect(errors[field as keyof typeof errors]).toBeUndefined();
  });

  it('U-V17: gom nhiều lỗi cùng lúc', () => {
    const errors = validateEntry(draft({ title: '', category: 'random' as never }), NOW);
    expect(errors.title).toBeDefined();
    expect(errors.category).toBeDefined();
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/validation.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/validation"`.

- [ ] **Step 4: Viết implementation tối thiểu**

`src/lib/validation.ts`:

```ts
import { CATEGORIES } from './types';
import type { EntryDraft, ValidationErrors } from './types';

const CATEGORY_VALUES: string[] = CATEGORIES.map((c) => c.value);

export function validateEntry(draft: EntryDraft, now: number = Date.now()): ValidationErrors {
  const errors: ValidationErrors = {};

  const title = draft.title?.trim() ?? '';
  if (title.length === 0) {
    errors.title = 'Tiêu đề không được để trống';
  } else if (title.length > 200) {
    errors.title = 'Tiêu đề tối đa 200 ký tự';
  }

  if (!CATEGORY_VALUES.includes(draft.category)) {
    errors.category = 'Phải chọn phân loại';
  }

  if (draft.content && draft.content.length > 5000) {
    errors.content = 'Nội dung tối đa 5000 ký tự';
  }

  const tags = draft.tags ?? [];
  if (tags.length > 10) {
    errors.tags = 'Tối đa 10 thẻ';
  } else if (tags.some((t) => t.length > 30)) {
    errors.tags = 'Mỗi thẻ tối đa 30 ký tự';
  }

  if (draft.sourceUrl && !isHttpUrl(draft.sourceUrl)) {
    errors.sourceUrl = 'URL không hợp lệ';
  }

  if (draft.reminderAt !== undefined && draft.reminderAt <= now) {
    errors.reminderAt = 'Thời điểm nhắc phải ở tương lai';
  }

  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
```

`now` nhận qua tham số chứ không gọi thẳng `Date.now()` bên trong — nếu không, test U-V15/U-V16 sẽ phụ thuộc đồng hồ thật và thỉnh thoảng đỏ.

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/validation.test.ts`
Expected: PASS, 17 test.

- [ ] **Step 6: Commit**

```bash
git add src/lib tests/unit/validation.test.ts
git commit -m "feat(E1): add entry types and validation"
```

---

## Task 5: TDD `src/store/diaryStore.ts`

**Files:**
- Create: `src/store/diaryStore.ts`
- Test: `tests/unit/diaryStore.test.ts`

**Interfaces:**
- Consumes: `Entry`, `EntryDraft`, `StorageAdapter` từ `src/lib/types.ts` (Task 4)
- Produces:
  - `type DiaryState = { entries: Entry[]; loading: boolean; error: string | null; hydrate(): Promise<void>; addEntry(draft: EntryDraft): Promise<Entry>; updateEntry(id: string, draft: EntryDraft): Promise<void>; deleteEntry(id: string): Promise<void> }`
  - `function createDiaryStore(adapter: StorageAdapter, newId?: () => string, now?: () => number)` — trả về Zustand store hook
  - `const useDiaryStore` — instance production, thêm ở Task 7

- [ ] **Step 1: Viết test thất bại**

`tests/unit/diaryStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDiaryStore } from '../../src/store/diaryStore';
import type { Entry, EntryDraft, StorageAdapter } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id-1',
    title: 'Cũ',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function draft(overrides: Partial<EntryDraft> = {}): EntryDraft {
  return { title: 'Mới', category: 'news', tags: [], ...overrides };
}

/** Adapter in-memory. `peek()` để test soi cái gì thực sự được ghi. */
function fakeAdapter(initial: Entry[] = []) {
  let data = [...initial];
  let failing = false;
  const adapter: StorageAdapter & { peek(): Entry[]; fail(): void } = {
    load: async () => {
      if (failing) throw new Error('read failed');
      return [...data];
    },
    save: async (entries) => {
      if (failing) throw new Error('write failed');
      data = [...entries];
    },
    peek: () => data,
    fail: () => {
      failing = true;
    },
  };
  return adapter;
}

const ids = () => {
  let n = 0;
  return () => `id-new-${++n}`;
};

describe('diaryStore', () => {
  it('U-S01: hydrate đọc entry từ adapter', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]));
    await store.getState().hydrate();
    expect(store.getState().entries).toHaveLength(1);
    expect(store.getState().entries[0].title).toBe('Cũ');
  });

  it('U-S02: hydrate sắp xếp mới nhất trước', async () => {
    const store = createDiaryStore(
      fakeAdapter([
        entry({ id: 'a', createdAt: 1000 }),
        entry({ id: 'b', createdAt: 3000 }),
        entry({ id: 'c', createdAt: 2000 }),
      ]),
    );
    await store.getState().hydrate();
    expect(store.getState().entries.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('U-S03: hydrate khi adapter lỗi thì đặt error', async () => {
    const adapter = fakeAdapter();
    adapter.fail();
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    expect(store.getState().error).not.toBeNull();
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().loading).toBe(false);
  });

  it('U-S04: addEntry gán id, createdAt, updatedAt', async () => {
    const store = createDiaryStore(fakeAdapter(), ids(), () => 5000);
    const created = await store.getState().addEntry(draft());
    expect(created.id).toBe('id-new-1');
    expect(created.createdAt).toBe(5000);
    expect(created.updatedAt).toBe(5000);
  });

  it('U-S05: addEntry ghi xuống adapter', async () => {
    const adapter = fakeAdapter();
    const store = createDiaryStore(adapter, ids(), () => 5000);
    await store.getState().addEntry(draft({ title: 'Đã lưu' }));
    expect(adapter.peek()).toHaveLength(1);
    expect(adapter.peek()[0].title).toBe('Đã lưu');
  });

  it('U-S06: addEntry đặt entry mới lên đầu', async () => {
    const store = createDiaryStore(
      fakeAdapter([entry({ id: 'cu', createdAt: 1000 })]),
      ids(),
      () => 9000,
    );
    await store.getState().hydrate();
    await store.getState().addEntry(draft());
    expect(store.getState().entries[0].id).toBe('id-new-1');
  });

  it('U-S07: addEntry khi ghi lỗi thì ném lỗi và hoàn nguyên state', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter, ids(), () => 9000);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().addEntry(draft())).rejects.toThrow();
    expect(store.getState().entries).toHaveLength(1);
    expect(store.getState().entries[0].id).toBe('id-1');
    expect(store.getState().error).not.toBeNull();
  });

  it('U-S08: updateEntry đổi field và bơm updatedAt, giữ createdAt', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]), ids(), () => 7000);
    await store.getState().hydrate();
    await store.getState().updateEntry('id-1', draft({ title: 'Đã sửa' }));

    const updated = store.getState().entries[0];
    expect(updated.title).toBe('Đã sửa');
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(7000);
  });

  it('U-S09: updateEntry với id không tồn tại thì không đổi gì', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]), ids(), () => 7000);
    await store.getState().hydrate();
    await store.getState().updateEntry('khong-co', draft({ title: 'X' }));
    expect(store.getState().entries[0].title).toBe('Cũ');
  });

  it('U-S10: deleteEntry xoá khỏi cả state lẫn adapter', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    await store.getState().deleteEntry('id-1');
    expect(store.getState().entries).toEqual([]);
    expect(adapter.peek()).toEqual([]);
  });

  it('U-S11: deleteEntry khi ghi lỗi thì hoàn nguyên state', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().deleteEntry('id-1')).rejects.toThrow();
    expect(store.getState().entries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/unit/diaryStore.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/store/diaryStore"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/store/diaryStore.ts`:

```ts
import { create } from 'zustand';
import type { Entry, EntryDraft, StorageAdapter } from '../lib/types';

export type DiaryState = {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addEntry: (draft: EntryDraft) => Promise<Entry>;
  updateEntry: (id: string, draft: EntryDraft) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const sortNewestFirst = (entries: Entry[]): Entry[] =>
  [...entries].sort((a, b) => b.createdAt - a.createdAt);

export function createDiaryStore(
  adapter: StorageAdapter,
  newId: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
) {
  return create<DiaryState>((set, get) => {
    /**
     * Ghi lạc quan rồi hoàn nguyên nếu adapter lỗi.
     * Ném lỗi ra ngoài để form biết mà giữ lại chữ người dùng đã gõ.
     */
    const persist = async (next: Entry[]) => {
      const previous = get().entries;
      set({ entries: next, error: null });
      try {
        await adapter.save(next);
      } catch {
        set({ entries: previous, error: 'Không lưu được dữ liệu' });
        throw new Error('save failed');
      }
    };

    return {
      entries: [],
      loading: false,
      error: null,

      hydrate: async () => {
        set({ loading: true, error: null });
        try {
          const entries = await adapter.load();
          set({ entries: sortNewestFirst(entries), loading: false });
        } catch {
          set({ error: 'Không đọc được dữ liệu', loading: false });
        }
      },

      addEntry: async (draft) => {
        const timestamp = now();
        const entry: Entry = { ...draft, id: newId(), createdAt: timestamp, updatedAt: timestamp };
        await persist(sortNewestFirst([entry, ...get().entries]));
        return entry;
      },

      updateEntry: async (id, draft) => {
        const current = get().entries;
        if (!current.some((e) => e.id === id)) return;
        const next = current.map((e) =>
          e.id === id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt, updatedAt: now() } : e,
        );
        await persist(sortNewestFirst(next));
      },

      deleteEntry: async (id) => {
        await persist(get().entries.filter((e) => e.id !== id));
      },
    };
  });
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/unit/diaryStore.test.ts`
Expected: PASS, 11 test.

- [ ] **Step 5: Chạy toàn bộ tầng unit**

Run: `npm run test:run`
Expected: PASS toàn bộ (smoke + validation + store).

- [ ] **Step 6: Commit**

```bash
git add src/store tests/unit/diaryStore.test.ts
git commit -m "feat(E1): add diary store with injectable storage adapter"
```

---

## Task 6: Viết test case tầng INTEGRATION cho E1 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/integration/e1-entry-core.md`

**Interfaces:**
- Consumes: tầng unit đã xanh (Task 4, Task 5)
- Produces: tài liệu test case được duyệt, làm đầu vào cho Task 7–10

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ. **Nếu đỏ, dừng lại và sửa** — `CLAUDE.md` cấm sang tầng sau khi tầng trước chưa xanh.

- [ ] **Step 2: Gọi agent `inte-tester` (Phase 1)**

Giao agent viết `docs/test-cases/integration/e1-entry-core.md`, phủ:

**`src/storage.ts` với fake chrome:**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| I-ST01 | `load()` khi storage rỗng | trả `[]` |
| I-ST02 | `load()` đọc mảng đã lưu | trả đúng mảng |
| I-ST03 | `load()` khi giá trị không phải mảng | trả `[]`, không ném lỗi |
| I-ST04 | `save()` ghi vào key `entries` | `store.entries` khớp |
| I-ST05 | `onEntriesChanged` gọi callback khi key `entries` đổi | callback chạy 1 lần |
| I-ST06 | hàm huỷ đăng ký gỡ được listener | callback không chạy nữa |

**`EntryForm` qua RTL:**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| I-F01 | Render với 5 lựa chọn category | thấy đủ 5 nhãn |
| I-F02 | Submit khi title rỗng | hiện `'Tiêu đề không được để trống'`, không gọi `onSubmit` |
| I-F03 | Submit hợp lệ | `onSubmit` nhận đúng draft |
| I-F04 | Lỗi hiện inline cạnh field | thông báo nằm trong element mà `aria-describedby` của input trỏ tới |
| I-F05 | Mở ở chế độ sửa | các field điền sẵn giá trị entry |
| I-F06 | Khi `onSubmit` ném lỗi | chữ trong form vẫn còn nguyên |

**`EntryList` qua RTL:**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| I-L01 | Hiện entry mới nhất trước | thứ tự DOM khớp |
| I-L02 | Mỗi dòng hiện title và huy hiệu category | text có mặt |
| I-L03 | Danh sách rỗng | hiện thông báo trạng thái rỗng |
| I-L04 | Bấm sửa | gọi `onEdit` với đúng entry |
| I-L05 | Bấm xoá | hiện hộp thoại xác nhận, chưa gọi `onDelete` |
| I-L06 | Xác nhận trong hộp thoại | gọi `onDelete` với đúng id |
| I-L07 | Huỷ trong hộp thoại | không gọi `onDelete`, hộp thoại đóng |

**`popup/App` nối dây:**

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| I-A01 | Mở popup thì điền sẵn URL tab hiện tại | input Nguồn có `'https://example.com/bai-viet'` |
| I-A02 | Mở popup thì focus vào ô title | `document.activeElement` là input title |
| I-A03 | Lưu entry rồi thấy nó trong danh sách | title hiện trong list |
| I-A04 | Có sẵn entry trong storage thì hiện ra khi mount | title hiện trong list |
| I-A05 | Khi ghi storage lỗi | hiện toast lỗi, chữ trong form còn nguyên |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

**Không viết test thật cho tới khi người dùng duyệt.**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/integration/e1-entry-core.md
git commit -m "test(E1): add integration test cases for entry core"
```

---

## Task 7: TDD `src/storage.ts` — adapter chrome.storage

**Files:**
- Create: `src/storage.ts`
- Modify: `src/store/diaryStore.ts` (thêm export `useDiaryStore` ở cuối file)
- Test: `tests/integration/storage.test.tsx`

**Interfaces:**
- Consumes: `installFakeChrome` (Task 2), `Entry`/`StorageAdapter` (Task 4), `createDiaryStore` (Task 5)
- Produces:
  - `const ENTRIES_KEY = 'entries'`
  - `const chromeStorage: StorageAdapter`
  - `function onEntriesChanged(callback: () => void): () => void` — trả về hàm huỷ đăng ký
  - `const useDiaryStore` — store production, export từ `src/store/diaryStore.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/storage.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { installFakeChrome } from '../helpers/fakeChrome';
import { chromeStorage, onEntriesChanged } from '../../src/storage';
import type { Entry } from '../../src/lib/types';

const sample: Entry = {
  id: 'id-1',
  title: 'Bài hay',
  category: 'blog',
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chromeStorage', () => {
  it('I-ST01: load trả mảng rỗng khi chưa có gì', async () => {
    installFakeChrome();
    expect(await chromeStorage.load()).toEqual([]);
  });

  it('I-ST02: load đọc được mảng đã lưu', async () => {
    installFakeChrome({ entries: [sample] });
    expect(await chromeStorage.load()).toEqual([sample]);
  });

  it('I-ST03: load trả mảng rỗng khi dữ liệu hỏng', async () => {
    installFakeChrome({ entries: 'khong-phai-mang' });
    expect(await chromeStorage.load()).toEqual([]);
  });

  it('I-ST04: save ghi vào key entries', async () => {
    const { store } = installFakeChrome();
    await chromeStorage.save([sample]);
    expect(store.entries).toEqual([sample]);
  });
});

describe('onEntriesChanged', () => {
  it('I-ST05: gọi callback khi key entries đổi', async () => {
    installFakeChrome();
    const spy = vi.fn();
    onEntriesChanged(spy);
    await chromeStorage.save([sample]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('I-ST06: hàm huỷ gỡ được listener', async () => {
    installFakeChrome();
    const spy = vi.fn();
    const unsubscribe = onEntriesChanged(spy);
    unsubscribe();
    await chromeStorage.save([sample]);
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/storage.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/storage"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/storage.ts`:

```ts
import type { Entry, StorageAdapter } from './lib/types';

export const ENTRIES_KEY = 'entries';

export const chromeStorage: StorageAdapter = {
  async load() {
    const result = await chrome.storage.local.get(ENTRIES_KEY);
    const value = result[ENTRIES_KEY];
    return Array.isArray(value) ? (value as Entry[]) : [];
  },
  async save(entries) {
    await chrome.storage.local.set({ [ENTRIES_KEY]: entries });
  },
};

/** Đăng ký nghe thay đổi key entries. Trả về hàm huỷ đăng ký. */
export function onEntriesChanged(callback: () => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'local' && ENTRIES_KEY in changes) callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
```

- [ ] **Step 4: Thêm store production vào cuối `src/store/diaryStore.ts`**

Giữ nguyên phần đã có, nối thêm:

```ts
import { chromeStorage } from '../storage';

/** Store dùng trong popup và options page. Test luôn dùng createDiaryStore với adapter riêng. */
export const useDiaryStore = createDiaryStore(chromeStorage);
```

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/storage.test.tsx`
Expected: PASS, 6 test.

- [ ] **Step 6: Commit**

```bash
git add src/storage.ts src/store/diaryStore.ts tests/integration/storage.test.tsx
git commit -m "feat(E1): add chrome.storage adapter and change listener"
```

---

## Task 8: TDD `EntryForm`

**Files:**
- Create: `src/popup/EntryForm.tsx`
- Test: `tests/integration/EntryForm.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `Entry`, `EntryDraft`, `ValidationErrors` (Task 4), `validateEntry` (Task 4)
- Produces: `function EntryForm(props: { initial?: Entry; defaultUrl?: string; onSubmit: (draft: EntryDraft) => Promise<void>; onCancel?: () => void }): JSX.Element` — export có tên, không phải default

- [ ] **Step 1: Viết test thất bại**

`tests/integration/EntryForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import type { Entry } from '../../src/lib/types';

const existing: Entry = {
  id: 'id-1',
  title: 'Bài cũ',
  category: 'news',
  content: 'Nội dung cũ',
  tags: [],
  sourceUrl: 'https://cu.com',
  createdAt: 1000,
  updatedAt: 1000,
};

describe('EntryForm', () => {
  it('I-F01: hiện đủ 5 phân loại', () => {
    render(<EntryForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Phân loại')).toBeInTheDocument();
    ['Email', 'Tin tức', 'Blog', 'Mạng xã hội', 'Khác'].forEach((label) => {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    });
  });

  it('I-F02: chặn submit khi title rỗng', async () => {
    const onSubmit = vi.fn();
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Tiêu đề không được để trống')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('I-F03: submit hợp lệ gọi onSubmit với đúng draft', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} defaultUrl="https://a.com/x" />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Bài mới', category: 'blog', sourceUrl: 'https://a.com/x' }),
    );
  });

  it('I-F04: lỗi được nối vào input qua aria-describedby', async () => {
    render(<EntryForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    const input = screen.getByLabelText('Tiêu đề');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Tiêu đề không được để trống',
    );
  });

  it('I-F05: chế độ sửa điền sẵn giá trị', () => {
    render(<EntryForm initial={existing} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Bài cũ');
    expect(screen.getByLabelText('Phân loại')).toHaveValue('news');
    expect(screen.getByLabelText('Ghi chú')).toHaveValue('Nội dung cũ');
  });

  it('I-F06: onSubmit lỗi thì giữ nguyên chữ đã gõ', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('save failed'));
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Đừng mất chữ này');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Đừng mất chữ này');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/EntryForm.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/popup/EntryForm"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/popup/EntryForm.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Entry, EntryDraft, ValidationErrors } from '../lib/types';
import { validateEntry } from '../lib/validation';

type Props = {
  initial?: Entry;
  defaultUrl?: string;
  onSubmit: (draft: EntryDraft) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({ initial, defaultUrl, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'blog');
  const [content, setContent] = useState(initial?.content ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? defaultUrl ?? '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);

  // F1.4: con trỏ nhảy vào ô tiêu đề ngay khi popup mở
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // URL tab về sau khi popup đã mount, nên phải điền muộn — nhưng chỉ khi tạo mới
  useEffect(() => {
    if (!initial && defaultUrl) setSourceUrl(defaultUrl);
  }, [initial, defaultUrl]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const draft: EntryDraft = {
      title,
      category,
      tags: initial?.tags ?? [],
      content: content || undefined,
      sourceUrl: sourceUrl || undefined,
      reminderAt: initial?.reminderAt,
    };

    const found = validateEntry(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await onSubmit(draft);
      if (!initial) {
        // Chỉ dọn form khi tạo mới. Lưu hỏng thì ném lỗi, không chạy tới đây.
        setTitle('');
        setContent('');
      }
    } catch {
      // Store đã đặt error để App hiện toast. Ở đây cố ý không đụng vào state form
      // — mất chữ người dùng vừa gõ là hỏng dữ liệu, không phải phiền toái nhỏ.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <Field label="Tiêu đề" id="title" error={errors.title}>
        {(props) => (
          <input
            {...props}
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <Field label="Phân loại" id="category" error={errors.category}>
        {(props) => (
          <select
            {...props}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded border px-2 py-1"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Ghi chú" id="content" error={errors.content}>
        {(props) => (
          <textarea
            {...props}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <Field label="Nguồn" id="sourceUrl" error={errors.sourceUrl}>
        {(props) => (
          <input
            {...props}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        )}
      </Field>

      <div className="flex gap-2">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
          Lưu
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-3 py-1">
            Huỷ
          </button>
        )}
      </div>
    </form>
  );
}

type FieldRenderProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/** Nối label, input và thông báo lỗi lại với nhau cho screen reader (PRD §7.1). */
function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': error ? errorId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/EntryForm.test.tsx`
Expected: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
git add src/popup/EntryForm.tsx tests/integration/EntryForm.test.tsx
git commit -m "feat(E1): add entry form with inline validation"
```

---

## Task 9: TDD `EntryList` kèm xác nhận xoá

**Files:**
- Create: `src/popup/EntryList.tsx`
- Test: `tests/integration/EntryList.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category`, `Entry` (Task 4)
- Produces: `function EntryList(props: { entries: Entry[]; onEdit: (entry: Entry) => void; onDelete: (id: string) => Promise<void> }): JSX.Element` — export có tên

- [ ] **Step 1: Viết test thất bại**

`tests/integration/EntryList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryList } from '../../src/popup/EntryList';
import type { Entry } from '../../src/lib/types';

const entries: Entry[] = [
  { id: 'moi', title: 'Bài mới', category: 'blog', tags: [], createdAt: 3000, updatedAt: 3000 },
  { id: 'cu', title: 'Bài cũ', category: 'news', tags: [], createdAt: 1000, updatedAt: 1000 },
];

describe('EntryList', () => {
  it('I-L01: giữ nguyên thứ tự truyền vào, mới nhất trước', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Bài mới')).toBeInTheDocument();
    expect(within(items[1]).getByText('Bài cũ')).toBeInTheDocument();
  });

  it('I-L02: mỗi dòng hiện title và huy hiệu phân loại', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const first = screen.getAllByRole('listitem')[0];
    expect(within(first).getByText('Bài mới')).toBeInTheDocument();
    expect(within(first).getByText(/Blog/)).toBeInTheDocument();
  });

  it('I-L03: danh sách rỗng hiện trạng thái rỗng', () => {
    render(<EntryList entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Chưa có ghi chép nào')).toBeInTheDocument();
  });

  it('I-L04: bấm sửa gọi onEdit với đúng entry', async () => {
    const onEdit = vi.fn();
    render(<EntryList entries={entries} onEdit={onEdit} onDelete={vi.fn()} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Sửa' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'moi' }));
  });

  it('I-L05: bấm xoá mở hộp thoại xác nhận, chưa xoá gì', async () => {
    const onDelete = vi.fn();
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('I-L06: xác nhận thì gọi onDelete với đúng id', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }),
    );

    expect(onDelete).toHaveBeenCalledWith('moi');
  });

  it('I-L07: huỷ thì đóng hộp thoại, không xoá', async () => {
    const onDelete = vi.fn();
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Huỷ' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/EntryList.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/popup/EntryList"`.

- [ ] **Step 3: Viết implementation tối thiểu**

`src/popup/EntryList.tsx`:

```tsx
import { useState } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Entry } from '../lib/types';

const CATEGORY_LABEL = new Map<Category, string>(CATEGORIES.map((c) => [c.value, c.label]));
const CATEGORY_ICON = new Map<Category, string>(CATEGORIES.map((c) => [c.value, c.icon]));

type Props = {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => Promise<void>;
};

export function EntryList({ entries, onEdit, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-gray-500">Chưa có ghi chép nào</p>;
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await onDelete(id);
  };

  return (
    <>
      <ul className="divide-y">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{entry.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5">
                  {CATEGORY_ICON.get(entry.category)} {CATEGORY_LABEL.get(entry.category)}
                </span>
                {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button type="button" onClick={() => onEdit(entry)} className="text-sm text-blue-600">
              Sửa
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(entry)}
              className="text-sm text-red-600"
            >
              Xoá
            </button>
          </li>
        ))}
      </ul>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xoá"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full rounded bg-white p-4">
            <p className="mb-3 text-sm">Xoá “{pendingDelete.title}”?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded border px-3 py-1 text-sm"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/EntryList.test.tsx`
Expected: PASS, 7 test.

- [ ] **Step 5: Commit**

```bash
git add src/popup/EntryList.tsx tests/integration/EntryList.test.tsx
git commit -m "feat(E1): add entry list with delete confirmation"
```

---

## Task 10: TDD `popup/App` — nối dây, autofill URL, toast lỗi

**Files:**
- Modify: `src/popup/App.tsx` (thay toàn bộ vỏ từ Task 1)
- Test: `tests/integration/popupApp.test.tsx`

**Interfaces:**
- Consumes: `useDiaryStore` (Task 7), `onEntriesChanged` (Task 7), `EntryForm` (Task 8), `EntryList` (Task 9), `installFakeChrome` (Task 2)
- Produces: `export default function App(): JSX.Element` — popup hoàn chỉnh của E1

- [ ] **Step 1: Viết test thất bại**

`tests/integration/popupApp.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** useDiaryStore được tạo lúc import module, nên fake chrome phải cài TRƯỚC khi import. */
async function renderApp() {
  const { default: App } = await import('../../src/popup/App');
  return render(<App />);
}

describe('popup App', () => {
  it('I-A01: điền sẵn URL tab hiện tại', async () => {
    installFakeChrome();
    await renderApp();
    await waitFor(() => {
      expect(screen.getByLabelText('Nguồn')).toHaveValue('https://example.com/bai-viet');
    });
  });

  it('I-A02: focus vào ô tiêu đề khi mở', async () => {
    installFakeChrome();
    await renderApp();
    expect(document.activeElement).toBe(screen.getByLabelText('Tiêu đề'));
  });

  it('I-A03: lưu entry rồi thấy trong danh sách', async () => {
    installFakeChrome();
    await renderApp();

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Ghi chép đầu tiên');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Ghi chép đầu tiên')).toBeInTheDocument();
  });

  it('I-A04: entry có sẵn trong storage hiện ra khi mount', async () => {
    installFakeChrome({
      entries: [
        {
          id: 'id-1',
          title: 'Đã lưu từ trước',
          category: 'blog',
          tags: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    });
    await renderApp();
    expect(await screen.findByText('Đã lưu từ trước')).toBeInTheDocument();
  });

  it('I-A05: ghi lỗi thì hiện toast và giữ chữ trong form', async () => {
    const fake = installFakeChrome();
    await renderApp();

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Giữ chữ này lại');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    fake.failNextSave();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Không lưu được dữ liệu')).toBeInTheDocument();
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Giữ chữ này lại');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npm run test:run -- tests/integration/popupApp.test.tsx`
Expected: FAIL — App hiện chỉ render `<h1>Reading Diary</h1>`, không tìm thấy label `Tiêu đề`.

- [ ] **Step 3: Viết implementation**

Thay toàn bộ `src/popup/App.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { EntryForm } from './EntryForm';
import { EntryList } from './EntryList';
import { onEntriesChanged } from '../storage';
import { useDiaryStore } from '../store/diaryStore';
import type { Entry, EntryDraft } from '../lib/types';

export default function App() {
  const entries = useDiaryStore((s) => s.entries);
  const error = useDiaryStore((s) => s.error);
  const hydrate = useDiaryStore((s) => s.hydrate);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const updateEntry = useDiaryStore((s) => s.updateEntry);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);

  const [currentUrl, setCurrentUrl] = useState<string>();
  const [editing, setEditing] = useState<Entry | null>(null);

  useEffect(() => {
    void hydrate();
    // Options page ghi thì popup thấy ngay — rẻ hơn nhiều so với message protocol
    return onEntriesChanged(() => {
      void hydrate();
    });
  }, [hydrate]);

  // F1.3: lấy URL tab hiện tại. activeTab chỉ cấp quyền khi người dùng chủ động
  // mở extension, nên phải đọc lúc popup mount chứ không sớm hơn.
  useEffect(() => {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => setCurrentUrl(tabs[0]?.url));
  }, []);

  const handleSubmit = async (draft: EntryDraft) => {
    if (editing) {
      await updateEntry(editing.id, draft);
      setEditing(null);
    } else {
      await addEntry(draft);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {error && (
        <p role="status" className="bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <EntryForm
        key={editing?.id ?? 'new'}
        initial={editing ?? undefined}
        defaultUrl={currentUrl}
        onSubmit={handleSubmit}
        onCancel={editing ? () => setEditing(null) : undefined}
      />

      <div className="flex-1 overflow-y-auto border-t">
        <EntryList entries={entries} onEdit={setEditing} onDelete={deleteEntry} />
      </div>
    </div>
  );
}
```

Hai chi tiết cố ý:
- `key={editing?.id ?? 'new'}` buộc `EntryForm` dựng lại khi chuyển giữa tạo mới và sửa — rẻ hơn nhiều so với tự đồng bộ từng field trong `useEffect`.
- Toast dùng `role="status"` chứ không `role="alert"`, vì `EntryForm` đã dùng `role="alert"` cho lỗi field; trùng role làm truy vấn test mơ hồ và làm screen reader đọc chồng.

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npm run test:run -- tests/integration/popupApp.test.tsx`
Expected: PASS, 5 test.

- [ ] **Step 5: Chạy toàn bộ unit + integration**

Run: `npm run test:run`
Expected: PASS toàn bộ — 1 smoke + 17 validation + 11 store + 6 storage + 6 form + 7 list + 5 app = 53 test.

- [ ] **Step 6: Kiểm tra bằng mắt trong Chrome**

```bash
npm run build
```

Vào `chrome://extensions`, bấm nút reload trên thẻ extension. Mở một trang web bất kỳ, nhấn `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`).

Kỳ vọng: popup mở, ô Nguồn đã điền URL trang đang xem, con trỏ nằm trong ô Tiêu đề. Gõ tiêu đề, chọn phân loại, bấm Lưu → entry hiện trong danh sách bên dưới. Đóng popup, mở lại → entry vẫn còn.

- [ ] **Step 7: Commit**

```bash
git add src/popup/App.tsx tests/integration/popupApp.test.tsx
git commit -m "feat(E1): wire popup with URL autofill and error toast"
```

---

## Task 11: Viết test case tầng E2E cho E1 — CỔNG DUYỆT

**Files:**
- Create: `docs/test-cases/e2e/e1-entry-core.md`

**Interfaces:**
- Consumes: tầng integration đã xanh (Task 7–10)
- Produces: tài liệu test case được duyệt, làm đầu vào cho Task 12

- [ ] **Step 1: Kiểm tra điều kiện vào**

Run: `npm run test:run`
Expected: PASS toàn bộ. Nếu đỏ, dừng và sửa trước.

- [ ] **Step 2: Gọi agent `e2e-tester` (Phase 1)**

Giao agent viết `docs/test-cases/e2e/e1-entry-core.md`. Chỉ **một** kịch bản khói — độ phủ nằm ở tầng dưới, tầng này chỉ chứng minh extension chạy thật trong Chrome:

| ID | Kịch bản | Các bước | Kỳ vọng |
|---|---|---|---|
| E-01 | Tạo entry rồi thấy nó tồn tại | 1. Chrome khởi động với extension unpacked từ `dist/`<br>2. Mở trang popup của extension<br>3. Gõ tiêu đề "Bài viết E2E"<br>4. Chọn phân loại Blog<br>5. Bấm Lưu<br>6. Tải lại trang popup | Sau bước 5 tiêu đề hiện trong danh sách; sau bước 6 vẫn còn — chứng minh đã ghi thật xuống `chrome.storage.local` |

- [ ] **Step 3: DỪNG — chờ người dùng duyệt**

- [ ] **Step 4: Commit sau khi được duyệt**

```bash
git add docs/test-cases/e2e/e1-entry-core.md
git commit -m "test(E1): add e2e test case for entry core"
```

---

## Task 12: E2E smoke test và đóng epic E1

**Files:**
- Create: `tests/e2e/e1-entry-core.spec.ts`, `README.md`
- Modify: `package.json` (script `test:e2e` build trước khi chạy)

**Interfaces:**
- Consumes: `dist/` từ `npm run build`, cấu hình Playwright (Task 2)
- Produces: `npm run test:e2e` xanh; E1 hoàn tất

- [ ] **Step 1: Viết test thất bại**

`tests/e2e/e1-entry-core.spec.ts`:

```ts
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Service worker đăng ký xong thì URL của nó chứa extension id
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('E-01: tạo entry và nó tồn tại sau khi tải lại', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E');
  await page.getByLabel('Phân loại').selectOption('blog');
  await page.getByRole('button', { name: 'Lưu' }).click();

  await expect(page.getByText('Bài viết E2E')).toBeVisible();

  // Tải lại chứng minh dữ liệu nằm trong chrome.storage.local, không phải state React
  await page.reload();
  await expect(page.getByText('Bài viết E2E')).toBeVisible();
});
```

- [ ] **Step 2: Xoá `dist/` rồi chạy, xác nhận ĐỎ**

```bash
rm -rf dist
npx playwright test
```

Expected: FAIL — Chromium không load được extension vì `dist/` không tồn tại.

- [ ] **Step 3: Build và chạy lại, xác nhận XANH**

```bash
npm run build
npx playwright test
```

Expected: PASS, 1 test.

Nếu đỏ vì hết giờ chờ service worker: kiểm tra `dist/manifest.json` có khối `background` trỏ tới file service worker đã build. Nếu đỏ vì không tìm thấy label: kiểm tra `dist/src/popup/index.html` tồn tại và đường dẫn trong `page.goto` khớp đúng.

- [ ] **Step 4: Cho `test:e2e` tự build trước**

Trong `package.json`, đổi script để e2e luôn chạy trên bản build mới nhất:

```json
{
  "scripts": {
    "test:e2e": "npm run build && playwright test"
  }
}
```

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Viết `README.md`**

````markdown
# Reading Diary

Chrome Extension ghi nhật ký đọc. Nhấn phím tắt trên trang bất kỳ để lưu lại nội dung đang đọc kèm phân loại và ghi chú.

## Cài đặt

```bash
npm install
npm run build
```

Mở `chrome://extensions`, bật Developer mode, bấm **Load unpacked**, chọn thư mục `dist/`.

## Sử dụng

Nhấn `Ctrl+Shift+D` (macOS: `Cmd+Shift+D`) để mở popup. URL trang hiện tại được điền sẵn. Đổi phím tắt tại `chrome://extensions/shortcuts`.

## Phát triển

```bash
npm run dev        # chế độ phát triển, có hot reload
npm run test       # unit + integration, chế độ theo dõi
npm run test:run   # unit + integration, chạy một lần
npm run test:e2e   # build rồi chạy e2e
```

## Tài liệu

- Yêu cầu sản phẩm: `docs/PRD.md`
- Thiết kế: `docs/superpowers/specs/2026-08-31-reading-diary-design.md`
- Test case: `docs/test-cases/`
````

- [ ] **Step 6: Chạy toàn bộ 3 tầng lần cuối**

```bash
npm run test:run
npm run test:e2e
```

Expected: cả hai PASS.

- [ ] **Step 7: Commit đóng epic**

```bash
git add -A
git commit -m "feat(E1): complete entry core with quick capture, CRUD, and categories"
git push origin main
```

---

## Các plan tiếp theo

Viết sau khi E1 xanh cả 3 tầng — không viết trước, vì chi tiết sẽ lệch khi code thật chạm đất.

| Plan | Epic | Nội dung |
|---|---|---|
| `<ngày>-e2-tags-search.md` | E2 | `lib/filter.ts`, `TagInput`, `SearchBar`, filter theo category/tag/khoảng ngày, debounce 300ms |
| `<ngày>-e3-reminders.md` | E3 | `chrome.alarms`, `chrome.notifications`, badge đếm, danh sách nhắc, snooze |
| `<ngày>-e4-data-stats.md` | E4 | `lib/transfer.ts`, `lib/stats.ts`, options page với export/import JSON và bảng thống kê |
