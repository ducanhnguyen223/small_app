# Integration Test Cases — E2: Tags + Search

**Epic:** E2 tags + search  
**Phase:** Phase 1 (inte-tester)  
**Status:** Review pending  
**Last Updated:** 2026-08-31

---

## TagInput (via RTL)

Tests the `TagInput` component in isolation, covering user interactions for adding/removing tags.

| ID | Description | Expected Outcome |
|---|---|---|
| TI-01 | Type text and press Enter | New tag appears as a chip; input clears |
| TI-02 | Type text and press comma | New tag is added; input clears |
| TI-03 | Click delete button on chip | Tag is removed from the list |
| TI-04 | Type duplicate tag and press Enter | No duplicate added; input clears without adding |
| TI-05 | Type 2+ characters matching a suggestion, click suggestion | Tag from suggestion is added; input clears |

---

## SearchBar (via RTL with fake timers for debounce)

Tests the `SearchBar` component with debouncing behavior, covering text input, category selection, tag filtering, and date range presets.

| ID | Description | Expected Outcome |
|---|---|---|
| SB-01 | Type text, wait 300ms | `onFiltersChange` called with `{ text: ... }` |
| SB-02 | Type text, wait only 100ms | `onFiltersChange` NOT yet called (debounce pending) |
| SB-03 | Select a category | `onFiltersChange` called with `{ category: ... }` after debounce delay |
| SB-04 | Click to select one tag from `allTags` list | `onFiltersChange` called with `{ tags: [selectedTag] }` |
| SB-05 | Select "Last 7 days" date preset | `onFiltersChange` called with `from` set to 7 days ago |

---

## Wiring: EntryForm + TagInput, EntryList + Highlight

Tests the integration of `TagInput` inside `EntryForm` and highlighting search results in `EntryList`.  
**Location:** `tests/integration/EntryFormTags.test.tsx`

| ID | Description | Expected Outcome |
|---|---|---|
| W-01 | Type tag via `TagInput` in `EntryForm`, then save | `onSubmit` callback receives draft with `tags` field containing the typed tag |
| W-02 | `EntryList` receives `highlightQuery` prop matching part of an entry title | Matching text is wrapped in `<mark>` element |
| W-03 | `EntryList` has no `highlightQuery` prop | No `<mark>` elements appear in DOM |

---

## Wiring: App + SearchBar + filterEntries

Tests end-to-end filter flow from `App` component through `SearchBar` to `EntryList` rendering.  
**Location:** `tests/integration/AppSearch.test.tsx`

| ID | Description | Expected Outcome |
|---|---|---|
| A-01 | Have 2 entries with different titles; type search text matching 1 entry; wait for debounce | `EntryList` displays only the matching entry |
| A-02 | Clear all search text | `EntryList` displays all entries again |

---

## Notes

- **Debounce delay:** 300ms (used in SB-02, SB-03 fake timer tests)
- **Testing approach:** React Testing Library (RTL) for component-level; Vitest for test framework
- **Fake timers:** Required for SearchBar tests to avoid actual delays during CI
