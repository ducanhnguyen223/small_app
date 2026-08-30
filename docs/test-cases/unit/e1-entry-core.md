# Unit Test Cases: E1 Entry Core

## Module `src/lib/validation.ts` — `validateEntry(draft, now)`

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

## Module `src/store/diaryStore.ts` — In-memory adapter

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
