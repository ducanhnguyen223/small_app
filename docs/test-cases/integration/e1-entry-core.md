# Integration Test Cases: Entry Core (E1)

## Module: `src/storage.ts` (with fake chrome)

| ID | Description | Expected Behavior |
|---|---|---|
| I-ST01 | `load()` when storage is empty | returns `[]` |
| I-ST02 | `load()` reads saved array | returns correct array |
| I-ST03 | `load()` when value is not an array | returns `[]`, does not throw error |
| I-ST04 | `save()` writes to `entries` key | `store.entries` matches |
| I-ST05 | `onEntriesChanged` calls callback when `entries` key changes | callback runs exactly 1 time |
| I-ST06 | unregister function removes listener | callback does not run anymore |

---

## Module: `EntryForm` (via RTL)

| ID | Description | Expected Behavior |
|---|---|---|
| I-F01 | Render with 5 category options | sees all 5 labels |
| I-F02 | Submit when title is empty | shows `'Tiêu đề không được để trống'`, does not call `onSubmit` |
| I-F03 | Valid submit | `onSubmit` receives correct draft |
| I-F04 | Error appears inline next to field | message is in element that input's `aria-describedby` points to |
| I-F05 | Open in edit mode | all fields pre-filled with entry values |
| I-F06 | When `onSubmit` throws error | text in form remains unchanged |

---

## Module: `EntryList` (via RTL)

| ID | Description | Expected Behavior |
|---|---|---|
| I-L01 | Show newest entry first | DOM order matches |
| I-L02 | Each row shows title and category badge | text is present |
| I-L03 | Empty list | shows empty state message |
| I-L04 | Click edit | calls `onEdit` with correct entry |
| I-L05 | Click delete | shows confirmation dialog, does not yet call `onDelete` |
| I-L06 | Confirm in dialog | calls `onDelete` with correct id |
| I-L07 | Cancel in dialog | does not call `onDelete`, dialog closes |

---

## Module: `popup/App` (integration wired)

| ID | Description | Expected Behavior |
|---|---|---|
| I-A01 | Open popup then pre-fill current tab URL | Source input has `'https://example.com/bai-viet'` |
| I-A02 | Open popup then focus on title field | `document.activeElement` is title input |
| I-A03 | Save entry then see it in list | title appears in list |
| I-A04 | Entries already in storage on mount | title appears in list on render |
| I-A05 | Storage write error | shows error toast, text in form remains unchanged |
