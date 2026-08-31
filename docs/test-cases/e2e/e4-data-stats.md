# E2E Test Cases — E4: Data Export/Import & Statistics

**Epic:** E4 data export/import & statistics  
**Phase:** Phase 1 (e2e-tester)  
**Status:** Ready for review  
**Last Updated:** 2026-08-31

---

## User Journeys

End-to-end test scenarios covering the complete workflow of exporting entries to JSON format and verifying the exported data integrity.

### E-04: Create Entry and Export to JSON

Tests the full user flow from creating an entry to exporting all entries to a JSON file with correct content.

| ID | Scenario | Steps | Expected Outcome |
|---|---|---|---|
| E-04 | Tạo entry rồi xuất ra file JSON đúng nội dung | 1. Mở popup, tạo entry "Bài viết E2E Export"<br>2. Lưu<br>3. Mở trang options<br>4. Bấm "Xuất ra JSON" | Sau bước 2: Entry hiện trong popup<br>Sau bước 4: Trình duyệt tải xuống 1 file, tên file chứa `reading-diary-export-`, nội dung file là JSON hợp lệ chứa entry "Bài viết E2E Export" |

---

## Test Environment

- **Browser:** Chrome/Chromium (via Vercel Agent Browser or Playwright)
- **Test data reset:** Clear all entries before each test run
- **Network:** Assume no network delays (local/in-memory storage)
- **Export validation:** Verify JSON format validity and entry content integrity
- **File download:** Capture and validate downloaded export file

---

## Preconditions

- Application is running and accessible
- All entries are cleared before test execution
- Entry creation popup is rendered and functional
- Options page with export functionality is accessible
- Browser download directory is writable and monitored

---

## Postconditions

- Application state remains consistent after export
- Created entry is persisted in storage
- Exported JSON file is downloadable and contains complete entry data
- No console errors or warnings during export operation
- Export file naming convention matches `reading-diary-export-{timestamp}.json`
