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
