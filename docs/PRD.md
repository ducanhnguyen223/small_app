# Product Requirements Document (PRD)

## Reading Diary - Chrome Extension

**Version:** 1.0
**Last Updated:** January 2026
**Status:** Draft

---

## 1. Product Overview

### 1.1 Vision

Reading Diary là Chrome Extension giúp người dùng ghi lại và quản lý nhật ký đọc từ nhiều nguồn khác nhau (email, news, blog, social media) một cách nhanh chóng thông qua phím tắt.

### 1.2 Problem Statement

- Người dùng đọc nhiều nội dung online mỗi ngày nhưng không có cách lưu trữ có hệ thống
- Bookmark truyền thống không cho phép ghi chú, phân loại, hay nhắc nhở
- Các ứng dụng note-taking phức tạp, tốn thời gian để mở và sử dụng
- Khó tìm lại nội dung đã đọc theo thời gian, chủ đề, hoặc tags

### 1.3 Solution

Extension nhẹ, mở nhanh bằng phím tắt, cho phép:
- Ghi lại nội dung đang đọc với metadata đầy đủ
- Phân loại và gắn tags
- Tìm kiếm đa chiều (thời gian, category, tags, text)
- Nhắc nhở xem lại nội dung quan trọng

---

## 2. Goals & Success Metrics

### 2.1 Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| User adoption | Weekly active users | 1,000 WAU trong 3 tháng đầu |
| Engagement | Entries per user/week | ≥ 5 entries |
| Retention | 30-day retention rate | ≥ 40% |
| Satisfaction | Chrome Web Store rating | ≥ 4.5 stars |

### 2.2 User Goals

- Lưu nội dung trong < 10 giây
- Tìm lại nội dung trong < 5 giây
- Không bỏ lỡ nội dung quan trọng nhờ reminder

---

## 3. User Personas

### 3.1 Primary Persona: Knowledge Worker

**Tên:** Minh - Software Developer
**Tuổi:** 28
**Hành vi:**
- Đọc 10-20 bài technical blog/tuần
- Thường bookmark nhưng không bao giờ xem lại
- Cần tham khảo lại các giải pháp đã đọc khi gặp vấn đề tương tự

**Pain points:**
- Bookmark lộn xộn, không phân loại
- Không nhớ đã đọc gì tuần trước
- Mất thời gian tìm lại bài viết

**Goals:**
- Lưu nhanh khi đọc xong
- Tìm theo keyword hoặc tag
- Xem lại theo timeline

### 3.2 Secondary Persona: Researcher

**Tên:** Linh - Content Researcher
**Tuổi:** 32
**Hành vi:**
- Research nhiều chủ đề cho công việc
- Cần track sources và references
- Làm việc với deadline

**Pain points:**
- Cần nhớ nguồn đã đọc
- Cần reminder để đọc lại trước deadline
- Cần phân loại theo project/topic

**Goals:**
- Ghi chú kèm source URL
- Đặt reminder cho deadline
- Filter theo category/project

---

## 4. Features & Requirements

### 4.1 Feature Overview

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| F1 | Quick Entry với Keyboard Shortcut | P0 | Planned |
| F2 | Entry Form (CRUD) | P0 | Planned |
| F3 | Category Management | P0 | Planned |
| F4 | Tags System | P0 | Planned |
| F5 | Search & Filter | P0 | Planned |
| F6 | Reminder System | P1 | Planned |
| F7 | Data Export/Import | P2 | Planned |
| F8 | Statistics Dashboard | P2 | Planned |

### 4.2 Feature Details

---

#### F1: Quick Entry với Keyboard Shortcut

**Description:** Mở extension popup nhanh bằng phím tắt

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Default shortcut: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows) | P0 |
| F1.2 | Shortcut có thể customize trong Chrome settings | P0 |
| F1.3 | Auto-fill URL của tab hiện tại | P0 |
| F1.4 | Auto-focus vào title field khi mở | P0 |

**Acceptance Criteria:**
- [ ] Nhấn shortcut mở popup trong < 200ms
- [ ] URL tự động điền vào sourceUrl field
- [ ] Cursor focus vào title input

---

#### F2: Entry Form (CRUD)

**Description:** Form nhập/sửa/xóa diary entry

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Create new entry với required fields (title, category) | P0 |
| F2.2 | Edit existing entry | P0 |
| F2.3 | Delete entry với confirmation | P0 |
| F2.4 | Form validation với error messages | P0 |
| F2.5 | Auto-save draft khi typing (debounced) | P1 |
| F2.6 | Keyboard navigation trong form (Tab, Enter) | P1 |

**Validation Rules:**

| Field | Rules |
|-------|-------|
| title | Required, 1-200 characters |
| category | Required, must be valid Category |
| content | Optional, max 5000 characters |
| tags | Max 10 tags, each tag max 30 characters |
| sourceUrl | Optional, must be valid URL format |
| reminder | Optional, must be future timestamp |

**Acceptance Criteria:**
- [ ] Submit form tạo entry thành công
- [ ] Validation errors hiển thị inline
- [ ] Edit mode load đúng data
- [ ] Delete confirmation modal hoạt động
- [ ] Entry persist sau khi đóng/mở extension

---

#### F3: Category Management

**Description:** Phân loại entries theo predefined categories

**Categories:**

| Category | Icon | Description |
|----------|------|-------------|
| `email` | 📧 | Email newsletters, communications |
| `news` | 📰 | News articles, current events |
| `blog` | 📝 | Blog posts, tutorials |
| `social` | 💬 | Social media posts, threads |
| `other` | 📌 | Miscellaneous content |

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Dropdown select với icons | P0 |
| F3.2 | Filter entries by category | P0 |
| F3.3 | Category badge hiển thị trong entry list | P0 |
| F3.4 | Custom categories (user-defined) | P2 |

**Acceptance Criteria:**
- [ ] 5 default categories available
- [ ] Category selection required khi tạo entry
- [ ] Filter by category hoạt động đúng
- [ ] Category badge có màu/icon phân biệt

---

#### F4: Tags System

**Description:** Gắn tags linh hoạt cho entries

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | Add multiple tags (max 10) | P0 |
| F4.2 | Tag autocomplete từ existing tags | P0 |
| F4.3 | Remove tag bằng click X | P0 |
| F4.4 | Search entries by tags | P0 |
| F4.5 | Tag suggestions based on content | P2 |
| F4.6 | Popular tags sidebar | P2 |

**UI Behavior:**
- Input field với comma/Enter để add tag
- Tags hiển thị dạng chips
- Autocomplete dropdown khi typing
- Click tag trong list → filter by tag

**Acceptance Criteria:**
- [ ] Add tag bằng Enter hoặc comma
- [ ] Autocomplete hiện sau 2 ký tự
- [ ] Remove tag hoạt động
- [ ] Search by multiple tags (OR logic)

---

#### F5: Search & Filter

**Description:** Tìm kiếm và lọc entries đa chiều

**Search Types:**

| Type | Description | Example |
|------|-------------|---------|
| Text search | Tìm trong title + content | "react hooks" |
| Tag search | Tìm theo tags | tag:javascript |
| Category filter | Lọc theo category | category:blog |
| Date range | Lọc theo khoảng thời gian | 7 ngày gần nhất |

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Full-text search (title + content) | P0 |
| F5.2 | Filter by category (single select) | P0 |
| F5.3 | Filter by tags (multi select, OR logic) | P0 |
| F5.4 | Filter by date range (presets + custom) | P0 |
| F5.5 | Combine multiple filters | P0 |
| F5.6 | Search highlight trong results | P1 |
| F5.7 | Recent searches history | P2 |

**Date Range Presets:**
- Today
- Last 7 days
- Last 30 days
- This month
- Custom range (date picker)

**Acceptance Criteria:**
- [ ] Search results update realtime (debounced 300ms)
- [ ] Empty state khi không có results
- [ ] Clear filters button
- [ ] Filters persist trong session

---

#### F6: Reminder System

**Description:** Nhắc nhở xem lại entries quan trọng

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | Set reminder date/time khi tạo/edit entry | P1 |
| F6.2 | Chrome notification khi đến thời điểm | P1 |
| F6.3 | Badge count cho pending reminders | P1 |
| F6.4 | Reminder list view | P1 |
| F6.5 | Snooze reminder (15min, 1h, 1d) | P1 |
| F6.6 | Recurring reminders | P2 |

**Notification Content:**
```
Title: Reading Diary Reminder
Body: "Xem lại: {entry.title}"
Action: Click → Open popup với entry đó
```

**Acceptance Criteria:**
- [ ] Date/time picker cho reminder
- [ ] Notification hiển thị đúng thời điểm
- [ ] Badge update khi có/hết pending reminders
- [ ] Click notification mở đúng entry

---

#### F7: Data Export/Import

**Description:** Backup và restore data

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F7.1 | Export all entries to JSON | P2 |
| F7.2 | Export to CSV | P2 |
| F7.3 | Import from JSON backup | P2 |
| F7.4 | Merge vs Replace option khi import | P2 |

**Export Format (JSON):**
```json
{
  "version": "1.0",
  "exportedAt": "2026-01-10T12:00:00Z",
  "entries": [...]
}
```

**Acceptance Criteria:**
- [ ] Export download file với timestamp trong filename
- [ ] Import validate format trước khi apply
- [ ] Merge giữ entries cũ, thêm entries mới
- [ ] Replace xóa hết và thay bằng imported data

---

#### F8: Statistics Dashboard

**Description:** Thống kê reading habits

**Metrics:**

| Metric | Description |
|--------|-------------|
| Total entries | Tổng số entries |
| Entries this week | Số entries tuần này |
| Top categories | Categories có nhiều entries nhất |
| Top tags | Tags được sử dụng nhiều nhất |
| Reading streak | Số ngày liên tục có entry |

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F8.1 | Summary stats card | P2 |
| F8.2 | Category distribution chart | P2 |
| F8.3 | Weekly activity heatmap | P2 |
| F8.4 | Tag cloud | P2 |

---

## 5. User Stories

### Epic 1: Entry Management

```
US-1.1: Tạo entry mới
As a user
I want to quickly create a diary entry
So that I can save what I'm reading before I forget

Acceptance Criteria:
- Given I'm on any webpage
- When I press Cmd+Shift+D
- Then the popup opens with URL pre-filled
- And I can enter title, category, content, tags
- And clicking Save creates the entry
```

```
US-1.2: Xem danh sách entries
As a user
I want to see my recent entries
So that I can review what I've been reading

Acceptance Criteria:
- Given I open the extension popup
- When the popup loads
- Then I see a list of entries sorted by newest first
- And each entry shows title, category, date, tags
```

```
US-1.3: Edit entry
As a user
I want to edit an existing entry
So that I can update or correct information

Acceptance Criteria:
- Given I see an entry in the list
- When I click the edit button
- Then the form opens with current data
- And I can modify any field
- And clicking Save updates the entry
```

```
US-1.4: Delete entry
As a user
I want to delete an entry
So that I can remove irrelevant content

Acceptance Criteria:
- Given I see an entry in the list
- When I click the delete button
- Then a confirmation dialog appears
- And clicking Confirm deletes the entry
- And clicking Cancel keeps the entry
```

### Epic 2: Search & Discovery

```
US-2.1: Search by text
As a user
I want to search entries by keywords
So that I can find specific content quickly

Acceptance Criteria:
- Given I'm in the popup
- When I type in the search box
- Then entries matching title or content appear
- And search is case-insensitive
```

```
US-2.2: Filter by category
As a user
I want to filter entries by category
So that I can focus on specific types of content

Acceptance Criteria:
- Given I'm viewing the entry list
- When I select a category filter
- Then only entries in that category are shown
```

```
US-2.3: Filter by date range
As a user
I want to filter entries by time period
So that I can review what I read recently

Acceptance Criteria:
- Given I'm viewing the entry list
- When I select a date range (e.g., Last 7 days)
- Then only entries within that range are shown
```

### Epic 3: Reminders

```
US-3.1: Set reminder
As a user
I want to set a reminder for an entry
So that I don't forget to review important content

Acceptance Criteria:
- Given I'm creating or editing an entry
- When I set a reminder date/time
- Then the reminder is saved with the entry
```

```
US-3.2: Receive notification
As a user
I want to receive a notification when reminder is due
So that I'm prompted to review the content

Acceptance Criteria:
- Given I have a pending reminder
- When the reminder time arrives
- Then I receive a Chrome notification
- And clicking it opens the entry
```
---

## 6. Technical Requirements

### 6.1 Browser Support

- Chrome 120+ (Manifest V3)
- Edge 120+ (Chromium-based)

### 6.2 Storage

- Primary: `chrome.storage.local` (10MB limit)
- Sync (optional): `chrome.storage.sync` (100KB limit)

### 6.3 Performance

| Metric | Target |
|--------|--------|
| Popup load time | < 200ms |
| Search response | < 100ms |
| Entry save | < 50ms |
| Memory usage | < 50MB |

### 6.4 Security

- No external API calls (offline-first)
- No user tracking/analytics (privacy-first)
- Data stored locally only
- Content Security Policy compliant

### 6.5 Permissions Required

| Permission | Reason |
|------------|--------|
| storage | Save entries locally |
| alarms | Schedule reminders |
| notifications | Show reminder alerts |
| activeTab | Get current page URL |

---

## 7. Non-Functional Requirements

### 7.1 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible
- Sufficient color contrast

### 7.2 Internationalization (P2)

- Vietnamese (default)
- English
- Date/time localization

### 7.3 Error Handling

- Graceful degradation
- Clear error messages
- Retry mechanisms
- Data recovery options

## 8. Out of Scope (v1.0)

- Cloud sync / account system
- Mobile app
- Browser extensions for Firefox/Safari
- Collaboration features
- AI-powered features (summarization, tagging)
- Web clipper (save full page content)
- Integration với third-party apps
