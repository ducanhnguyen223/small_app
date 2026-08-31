# Integration Test Cases — E4: Data Transfer & Stats

## Overview
Integration test cases for Reading Diary epic E4 covering:
- Data export/import functionality via `diaryStore.setAll`
- UI interactions in `options/App.tsx` (RTL + fake Chrome environment)

---

## `diaryStore.setAll` Integration Tests

Extends `tests/unit/diaryStore.test.ts` to verify state consistency across adapter layer.

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| U-S12 | `setAll` ghi đè toàn bộ entries | `entries` trong state và adapter khớp đúng mảng mới |
| U-S13 | `setAll` khi ghi lỗi thì hoàn nguyên | `entries` quay về như cũ, ném lỗi |

---

## `options/App.tsx` Integration Tests

RTL + fake Chrome environment tests for export/import UI flows.

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| OA-01 | Click "Xuất ra JSON" | `URL.createObjectURL` được gọi, thẻ `<a>` được click (tải xuống kích hoạt) |
| OA-02 | Chọn file JSON hợp lệ | Hiện số lượng entry tìm thấy trong file |
| OA-03 | Chọn file không hợp lệ | Hiện thông báo lỗi, không hiện lựa chọn Gộp/Thay thế |
| OA-04 | Click "Gộp" sau khi chọn file hợp lệ | Entries mới được thêm, entries cũ giữ nguyên |
| OA-05 | Click "Thay thế" sau khi chọn file hợp lệ | Entries cũ bị xoá, thay bằng entries trong file |
| OA-06 | Hiện đúng số liệu tổng/tuần này/chuỗi ngày | Số hiện đúng theo entries đang có |
| OA-07 | Hiện top category/tag | Tên category/tag đúng thứ tự nhiều nhất trước |
