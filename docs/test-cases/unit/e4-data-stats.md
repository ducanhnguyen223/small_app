# Unit Test Cases — E4 (Data Export/Import + Stats)

## Module: `src/lib/transfer.ts`

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

## Module: `src/lib/stats.ts` — `computeStats(entries, now)`

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
