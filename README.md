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

Trong popup: tạo/sửa/xoá entry, gắn thẻ, tìm kiếm và lọc theo tiêu đề/nội dung/phân loại/thẻ/khoảng ngày, đặt nhắc nhở xem lại (tab **Nhắc nhở**, snooze 15 phút/1 giờ/1 ngày).

## Trang cài đặt

Chuột phải icon extension → **Tuỳ chọn** (hoặc mở `chrome-extension://<id>/src/options/index.html`) để:

- Xem thống kê: tổng số entry, số entry tuần này, chuỗi ngày liên tục, top 5 phân loại/thẻ dùng nhiều nhất.
- **Xuất dữ liệu** ra file JSON (có timestamp trong tên file).
- **Nhập dữ liệu** từ file JSON đã xuất trước đó — chọn **Gộp** (giữ dữ liệu cũ, thêm entry mới) hoặc **Thay thế** (xoá hết, dùng dữ liệu trong file).

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
