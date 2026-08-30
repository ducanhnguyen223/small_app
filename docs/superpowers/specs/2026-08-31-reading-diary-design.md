# Reading Diary — Design Spec

**Ngày:** 2026-08-31
**Trạng thái:** Approved
**Nguồn yêu cầu:** `docs/PRD.md`
**Quy trình:** TDD 3 tầng theo `CLAUDE.md`

---

## 1. Mục tiêu

Chrome Extension (Manifest V3) ghi nhật ký đọc. Người dùng nhấn phím tắt trên bất kỳ trang web nào, popup mở với URL tab hiện tại điền sẵn, nhập title/category/tags/note, lưu vào `chrome.storage.local`. Sau đó tìm lại bằng search/filter, và nhận nhắc nhở xem lại.

Phạm vi: toàn bộ F1–F8 trong PRD (trừ các mục P2 liệt kê ở §9).

Ràng buộc cứng:
- Offline-first: không gọi API ngoài, không tracking. Data chỉ nằm trên máy người dùng.
- Phát triển theo TDD nghiêm ngặt: unit → integration → e2e, tuần tự, không song song.
- Ưu tiên thi hành gọn: cắt bề rộng test ở tầng đắt, không cắt tầng đáy.

---

## 2. Tech stack

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Build | Vite + `@crxjs/vite-plugin` | HMR cho MV3, không tự viết build script |
| UI | React + TypeScript | Theo `CLAUDE.md` |
| Styling | Tailwind CSS | Theo `CLAUDE.md` |
| State | Zustand | Theo `CLAUDE.md`; store là hàm thuần, unit test không cần mock |
| Unit/Integration test | Vitest + React Testing Library + jsdom | Cùng runtime với Vite, không cấu hình riêng |
| E2E | Playwright (`launchPersistentContext` + `--load-extension`) | Cách chuẩn để test extension unpacked |
| Mock Chrome API | Fake object tự viết + `vi.stubGlobal('chrome', ...)` | Không thêm dependency cho thứ vài chục dòng làm được |

Phiên bản chính xác của mỗi thư viện phải tra Context7 MCP tại thời điểm scaffold (E0), không dùng trí nhớ.

---

## 3. Kiến trúc

### 3.1 Quyết định: Zustand + persist qua `chrome.storage.local`

Store là nguồn sự thật trong từng context (popup, options). Persist xuống `chrome.storage.local`. Service worker **không** giữ state — khi alarm nổ thì đọc thẳng storage.

Đã cân nhắc và loại:
- **Service worker giữ state, UI gửi message:** thêm tầng message protocol, mọi thao tác thành async, SW bị kill thì phải rehydrate. Test tốn gấp đôi. Không đáng cho app local-only.
- **Không store, component gọi thẳng `chrome.storage`:** mọi component phải mock Chrome API khi test → unit test biến thành integration test, phá tầng đáy kim tự tháp.

### 3.2 Cấu trúc thư mục

```
src/
  lib/                 # THUẦN — cấm import chrome.*  → tầng unit
    types.ts             Entry, Category, Filters
    validation.ts        validateEntry() → Record<field, message>
    filter.ts            filterEntries(entries, filters)
    stats.ts             computeStats(entries)
    transfer.ts          toExportJSON() / parseImport()
  storage.ts           # adapter mỏng bọc chrome.storage.local → tầng integration
  store/
    diaryStore.ts        # Zustand; nhận storage adapter qua tham số (injectable)
  popup/
    App.tsx, EntryForm.tsx, EntryList.tsx, SearchBar.tsx, TagInput.tsx
  options/
    App.tsx, StatsPanel.tsx, DataPanel.tsx
  background.ts        # service worker: chrome.alarms + chrome.notifications
manifest.config.ts     # MV3 manifest
tests/
  unit/  integration/  e2e/
docs/
  PRD.md
  test-cases/{unit,integration,e2e}/
  superpowers/specs/
```

**Quy tắc bất khả xâm phạm:** `src/lib/**` không được import `chrome` hay `zustand`. Đây là điều kiện để unit test chạy không cần mock. Vi phạm quy tắc này là làm hỏng tầng đáy kim tự tháp.

### 3.3 Đồng bộ giữa popup và options

Mỗi context mount một store instance riêng. Đăng ký `chrome.storage.onChanged` → gọi `store.hydrate()`. Khoảng 10 dòng, không cần message protocol.

---

## 4. Data model

```ts
type Category = 'email' | 'news' | 'blog' | 'social' | 'other';

type Entry = {
  id: string;          // crypto.randomUUID()
  title: string;       // bắt buộc, 1-200 ký tự
  category: Category;  // bắt buộc
  content?: string;    // tối đa 5000 ký tự
  tags: string[];      // tối đa 10, mỗi tag tối đa 30 ký tự
  sourceUrl?: string;  // URL hợp lệ
  reminderAt?: number; // epoch ms, phải ở tương lai
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
};
```

Bộ lọc dùng cho search (E2):

```ts
type Filters = {
  text?: string;        // tìm trong title + content, không phân biệt hoa thường
  category?: Category;  // chọn một
  tags?: string[];      // chọn nhiều, logic OR
  from?: number;        // epoch ms, đầu khoảng
  to?: number;          // epoch ms, cuối khoảng
};
```

Lưu trữ: một key duy nhất trong `chrome.storage.local`:

```
{ entries: Entry[] }
```

Không index, không normalize. Vài trăm entry thì `Array.filter()` chạy dưới 1ms — thừa ngân sách so với mục tiêu search < 100ms trong PRD §6.3. Chỉ dựng index khi đo được là chậm.

Không dùng `chrome.storage.sync` (giới hạn 100KB, và PRD §8 đã loại cloud sync khỏi v1.0).

---

## 5. Chiến lược test

| Tầng | Phủ cái gì | Tỉ trọng | Mock |
|---|---|---|---|
| Unit | `src/lib/*` + actions của `diaryStore` | ~70% số test, viết dạng table-driven | Không mock gì; store nhận fake adapter in-memory |
| Integration | Component qua RTL + `storage.ts` adapter | ~25%; chỉ happy path + 1–2 lỗi chính mỗi feature | `vi.stubGlobal('chrome', fakeChrome)` |
| E2E | Playwright, extension load unpacked | 1 smoke test mỗi epic (tổng 4) | Không |

Cân nhắc tốc độ: E2E là tầng đắt nhất (setup lâu, dễ flaky). Giữ đúng 1 smoke mỗi epic để vẫn đủ 3 tầng theo `CLAUDE.md` mà không nuốt thời gian. Không phủ hết luồng ở tầng này — độ phủ nằm ở tầng unit.

Vòng lặp mỗi tầng theo `CLAUDE.md`: agent viết test case markdown → **người dùng duyệt** → agent viết test thật → chạy RED → main agent implement → chạy GREEN → refactor.

---

## 6. Thứ tự thi hành

| Epic | Feature PRD | Nội dung |
|---|---|---|
| **E0** | — | Scaffold: Vite + CRXJS + React + TS + Tailwind, manifest MV3, cấu hình Vitest/RTL/Playwright, `src/lib/types.ts`. Không chạy TDD (chỉ config, không có logic để test). |
| **E1** | F1, F2, F3 | Phím tắt `Ctrl/Cmd+Shift+D`, auto-fill URL tab hiện tại, auto-focus title, CRUD entry, validation, 5 category cố định, list sắp xếp mới nhất trước |
| **E2** | F4, F5 | TagInput (Enter/comma để thêm, autocomplete sau 2 ký tự, click X để xoá), search full-text, filter category/tag/date-range, kết hợp nhiều filter, debounce 300ms |
| **E3** | F6 | `chrome.alarms` khi lưu reminder, `chrome.notifications` khi đến hạn, badge count pending, reminder list, snooze 15m/1h/1d |
| **E4** | F7, F8 | Options page: export/import JSON (Merge vs Replace), stats (tổng, tuần này, top 5 category, top 5 tag, streak) |

Commit sau khi mỗi epic xanh cả 3 tầng: `feat(E{n}): {mô tả}`.

---

## 7. Permissions (manifest MV3)

| Permission | Dùng để |
|---|---|
| `storage` | Lưu entries |
| `alarms` | Lên lịch reminder (E3) |
| `notifications` | Hiện thông báo reminder (E3) |
| `activeTab` | Đọc URL tab hiện tại khi mở popup |

Không xin thêm quyền nào khác. Không `host_permissions`, không `tabs` (dùng `activeTab` là đủ cho việc lấy URL).

---

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Field không hợp lệ | Thông báo lỗi inline dưới field, sinh từ `lib/validation.ts`. Không submit. |
| Ghi `chrome.storage` thất bại | Hiện toast lỗi, **giữ nguyên data trong form** — không được để mất chữ người dùng đã gõ. |
| Import file sai định dạng | `parseImport()` validate shape trước. Sai thì từ chối, không đụng vào data cũ. |
| Import hợp lệ | Hỏi Merge (giữ cũ + thêm mới) hay Replace (xoá hết, thay bằng data import) trước khi ghi. |
| Storage gần đầy (10MB) | Cảnh báo khi import bộ data lớn, chặn trước khi ghi hỏng. |
| Xoá entry | Modal xác nhận. Cancel giữ nguyên entry. |

---

## 9. Nằm ngoài phạm vi

Các mục P2 trong PRD, cắt để giữ tốc độ. Không đụng tới bất kỳ mục P0 hay P1 nào.

- F2.5 autosave draft khi gõ
- F3.4 custom category do người dùng tự định nghĩa (giữ 5 category cố định)
- F4.5 gợi ý tag dựa trên nội dung
- F4.6 sidebar popular tags
- F5.7 lịch sử tìm kiếm gần đây
- F6.6 recurring reminder
- F7.2 export CSV (chỉ làm JSON)
- F8.3 heatmap hoạt động theo tuần
- F8.4 tag cloud
- i18n framework — UI viết cứng tiếng Việt (PRD §7.2 đặt tiếng Việt làm mặc định, i18n là P2)

F8 stats rút gọn còn: số liệu tổng + top 5 category + top 5 tag + reading streak, thanh bar vẽ bằng CSS thuần (không thêm thư viện chart).

Ngoài ra giữ nguyên các mục PRD §8 đã loại khỏi v1.0: cloud sync, mobile app, Firefox/Safari, collaboration, AI features, web clipper, tích hợp bên thứ ba.

---

## 10. Tiêu chí hoàn thành

- [ ] `npm run test:run` xanh toàn bộ (unit + integration)
- [ ] `npm run test:e2e` xanh 4 smoke test
- [ ] `npm run build` ra thư mục `dist/` load được vào Chrome qua "Load unpacked"
- [ ] Nhấn phím tắt mở popup, URL điền sẵn, tạo được entry, entry còn nguyên sau khi đóng/mở lại extension
- [ ] Search, filter category/tag/date hoạt động và kết hợp được với nhau
- [ ] Reminder bắn notification đúng thời điểm, click vào mở đúng entry
- [ ] Export ra file JSON, import lại được cả chế độ Merge và Replace
- [ ] README hướng dẫn cài đặt và chạy
