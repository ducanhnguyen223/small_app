# Integration Test Cases — E3 Reminders

## Background Service (`src/background.ts`)

Tests: `tests/integration/background.test.ts`

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| BG-01 | `reconcile()` khi có entry với reminder tương lai | tạo đúng 1 alarm tên `reminder-{id}` |
| BG-02 | `reconcile()` xoá alarm cũ trước khi tạo lại | alarm cũ không đúng entry hiện tại bị `chrome.alarms.clear` |
| BG-03 | `reconcile()` cập nhật badge đúng số lượng pending | `chrome.action.setBadgeText` gọi với `{ text: '1' }` |
| BG-04 | `reconcile()` khi không có reminder nào | badge text rỗng `''` |
| BG-05 | `handleAlarm()` tạo notification đúng nội dung | `chrome.notifications.create` gọi với title/message đúng PRD |
| BG-06 | `handleAlarm()` với alarm không khớp entry nào | không gọi `chrome.notifications.create` |
| BG-07 | `handleNotificationClick()` mở tab đúng URL chứa entryId | `chrome.tabs.create` gọi với url chứa `?entryId={id}` |
| BG-08 | `handleNotificationClick()` xoá notification sau khi click | `chrome.notifications.clear` được gọi |

## EntryForm Reminder Field

Tests: `tests/integration/EntryFormReminder.test.tsx`

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| ERM-01 | Nhập ngày giờ tương lai vào field Nhắc nhở rồi Lưu | `onSubmit` nhận `reminderAt` đúng epoch ms |
| ERM-02 | Bỏ trống field Nhắc nhở | `onSubmit` nhận `reminderAt: undefined` |
| ERM-03 | Chế độ sửa, entry có sẵn reminder | field điền sẵn đúng giá trị |

## ReminderList Component

Tests: `tests/integration/ReminderList.test.tsx`

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| RL-01 | Không có reminder nào đang chờ | hiện thông báo trạng thái rỗng |
| RL-02 | Có reminder | hiện title + thời điểm |
| RL-03 | Click nút "+15 phút" | `onSnooze` gọi với id đúng và thời điểm mới = now+15 phút |
| RL-04 | Click title | `onSelect` gọi với đúng entry |

## App Wiring (Tab & Deep Link)

Tests: `tests/integration/AppReminders.test.tsx`

| ID | Mô tả | Kỳ vọng |
|---|---|---|
| AR-01 | Click tab "Nhắc nhở" | `ReminderList` hiện ra thay `EntryList` |
| AR-02 | URL có `?entryId={id}` khi mount | form tự mở ở chế độ sửa đúng entry đó |
