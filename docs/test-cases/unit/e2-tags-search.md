# Unit Test Cases — E2: Tags & Search

## Module: `src/lib/filter.ts` — Function `filterEntries(entries, filters)`

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| F-01 | Filters rỗng | `{}` | trả về toàn bộ entries, nguyên thứ tự |
| F-02 | Text khớp title | `{ text: 'react' }`, entry title chứa "React Hooks" | entry có mặt trong kết quả (không phân biệt hoa thường) |
| F-03 | Text không khớp title lẫn content | `{ text: 'khong-co' }` | entry bị loại |
| F-04 | Category khớp | `{ category: 'blog' }` | chỉ giữ entry category blog |
| F-05 | Category không khớp | `{ category: 'news' }`, entry category blog | entry bị loại |
| F-06 | Tags OR — khớp 1 trong nhiều tag filter | `{ tags: ['a','b'] }`, entry có tag `b` | entry có mặt |
| F-07 | Tags không khớp tag nào | `{ tags: ['x'] }`, entry tags `['a']` | entry bị loại |
| F-08 | Khoảng ngày inclusive | `{ from: 1000, to: 2000 }`, entry `createdAt: 1000` và entry khác `createdAt: 2000` | cả hai đều giữ (biên inclusive) |
| F-09 | Kết hợp nhiều filter (AND) | `{ text: 'react', category: 'blog' }`, 1 entry khớp cả hai, 1 entry chỉ khớp text | chỉ entry khớp cả hai có mặt |

## Module: `src/lib/highlight.ts` — Function `highlightMatches(text, query)`

| ID | Mô tả | Input | Kỳ vọng |
|---|---|---|---|
| H-01 | Query rỗng | `highlightMatches('Hello', '')` | `[{ text: 'Hello', match: false }]` |
| H-02 | Query không xuất hiện | `highlightMatches('Hello', 'zzz')` | `[{ text: 'Hello', match: false }]` |
| H-03 | Query khớp giữa text | `highlightMatches('Hello World', 'lo Wo')` | 3 đoạn: `'Hel'` (false), `'lo Wo'` (true), `'rld'` (false) |
| H-04 | Query khớp nhiều lần | `highlightMatches('ab ab', 'ab')` | 3 đoạn: `'ab'`(true), `' '`(false), `'ab'`(true) |
| H-05 | Text rỗng | `highlightMatches('', 'abc')` | `[]` |
