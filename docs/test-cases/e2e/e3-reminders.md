# E2E Test Cases — E3: Reminders

**Epic:** E3 reminders  
**Phase:** Phase 1 (e2e-tester)  
**Status:** Ready for review  
**Last Updated:** 2026-08-31

---

## User Journeys

End-to-end test scenarios covering the complete workflow of setting reminders on entries and viewing them in the Reminders tab.

### E-03: Set Entry Reminder, then View in Reminders Tab

Tests the full user flow from creating an entry with a reminder to viewing the entry and its reminder actions in the dedicated Reminders tab.

| ID | Scenario | Steps | Expected Outcome |
|---|---|---|---|
| E-03 | Set entry reminder then view in Reminders tab | 1. Open entry creation popup<br>2. Create entry titled "Bài viết E2E Reminder" and set Reminder to 1 hour later<br>3. Save entry<br>4. Click on "Nhắc nhở" (Reminders) tab | After step 3: Entry appears in the "Danh sách" (List) tab<br>After step 4: Entry appears in the "Nhắc nhở" (Reminders) tab with quick-action buttons: "+15 phút" (add 15 min), "+1 giờ" (add 1 hour), "+1 ngày" (add 1 day) |

---

## Test Environment

- **Browser:** Chrome/Chromium (via Vercel Agent Browser or Playwright)
- **Test data reset:** Clear all entries before each test run
- **Network:** Assume no network delays (local/in-memory storage)
- **Reminder display:** Reminder tab should display entries with active reminders, regardless of reminder time

---

## Preconditions

- Application is running and accessible
- All entries are cleared before test execution
- Entry creation popup and Reminders tab are rendered and functional
- System clock/time is accessible for reminder calculations

---

## Postconditions

- Application state remains consistent after each interaction
- Entry with reminder is persisted in storage
- No console errors or warnings
- Quick-action buttons (+15 min, +1 hour, +1 day) are clickable and functional
