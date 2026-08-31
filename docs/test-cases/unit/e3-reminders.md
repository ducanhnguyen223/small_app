# Unit Test Cases: E3 Reminders

Module: `src/lib/reminders.ts`

## Test Case Table

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| R-01 | `pendingReminders` lọc entry có `reminderAt` ở tương lai | entry `reminderAt: now+1000`, entry khác không có `reminderAt` | chỉ entry có `reminderAt` tương lai có mặt |
| R-02 | `pendingReminders` loại entry `reminderAt` đã qua | `reminderAt: now-1000` | entry bị loại |
| R-03 | `pendingReminders` sắp xếp gần nhất trước | 2 entry `reminderAt` khác nhau | thứ tự tăng dần theo `reminderAt` |
| R-04 | `computeAlarms` sinh đúng tên và thời điểm | entry `id: 'a'`, `reminderAt: 5000` | `[{ name: 'reminder-a', when: 5000 }]` |
| R-05 | `computeAlarms` bỏ qua entry không có reminder tương lai | entry `reminderAt` quá khứ | mảng rỗng |
| R-06 | `snoozeUntil('15m', now)` | `now: 0` | `900000` (15×60×1000) |
| R-07 | `snoozeUntil('1h', now)` | `now: 0` | `3600000` |
| R-08 | `snoozeUntil('1d', now)` | `now: 0` | `86400000` |
| R-09 | `entryIdFromAlarmName` hợp lệ | `'reminder-abc'` | `'abc'` |
| R-10 | `entryIdFromAlarmName` không đúng tiền tố | `'khac-abc'` | `null` |
| R-11 | `notificationFor` tìm thấy entry | alarm name `'reminder-a'`, entry `id:'a', title:'Bài hay'` | `{ id:'a', title:'Reading Diary Reminder', message:'Xem lại: Bài hay' }` |
| R-12 | `notificationFor` không tìm thấy entry (đã xoá) | alarm name `'reminder-khong-ton-tai'` | `null` |
