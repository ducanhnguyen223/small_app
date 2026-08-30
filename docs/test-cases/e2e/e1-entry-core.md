# E2E Test Cases - Entry Core (E1)

## Overview
Phase 1 E2E tests for Reading Diary Chrome Extension. These scenarios verify that the extension runs in a real Chrome environment and persists data through `chrome.storage.local`.

## Test Scenario

| ID | Kịch bản | Các bước | Kỳ vọng |
|---|---|---|---|
| E-01 | Tạo entry rồi thấy nó tồn tại | 1. Chrome khởi động với extension unpacked từ `dist/`<br>2. Mở trang popup của extension<br>3. Gõ tiêu đề "Bài viết E2E"<br>4. Chọn phân loại Blog<br>5. Bấm Lưu<br>6. Tải lại trang popup | Sau bước 5 tiêu đề hiện trong danh sách; sau bước 6 vẫn còn — chứng minh đã ghi thật xuống `chrome.storage.local` |

## Scope

This test case verifies end-to-end functionality:
- Extension loads correctly in Chrome (unpacked from `dist/`)
- Popup UI renders and accepts user input
- Form submission creates a new entry (title + category)
- Entry appears in the list immediately after save
- Entry persists after popup reload (chrome.storage.local integration)

## Notes

- This is a smoke test to confirm the extension works in a real browser environment
- Detailed coverage of UI behavior, edge cases, and error handling is in the unit and integration test layers
- The test uses real Chrome storage to verify persistence, not mocked storage
