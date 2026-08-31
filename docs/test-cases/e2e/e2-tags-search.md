# E2E Test Cases — E2: Tags & Search

**Epic:** E2 tags + search  
**Phase:** Phase 1 (e2e-tester)  
**Status:** Ready for review  
**Last Updated:** 2026-08-31

---

## User Journeys

End-to-end test scenarios covering the complete workflow of adding entries with tags and searching by text.

### E-02: Add Entry with Tag, then Search

Tests the full user flow from creating a tagged entry to filtering entries by search query.

| ID | Scenario | Steps | Expected Outcome |
|---|---|---|---|
| E-02 | Add tagged entry, search by keyword | 1. Open entry creation popup<br>2. Create entry titled "Bài viết E2E Search" and assign tag "smoke"<br>3. Save entry<br>4. Type "Search" in search box<br>5. Wait for debounce (300ms) | After step 3: Entry appears in the entry list<br>After step 5: Entry remains visible (keyword matches title)<br>Type non-matching keyword (e.g., "xyz"): Entry disappears from the list |

---

## Test Environment

- **Browser:** Chrome/Chromium (via Vercel Agent Browser or Playwright)
- **Debounce delay:** 300ms (built into SearchBar component)
- **Test data reset:** Clear all entries before each test run
- **Network:** Assume no network delays (local/in-memory storage)

---

## Preconditions

- Application is running and accessible
- All entries are cleared before test execution
- SearchBar and EntryForm components are rendered and functional

---

## Postconditions

- Application state remains consistent after each interaction
- No console errors or warnings
- Search results update in real-time without page reload
