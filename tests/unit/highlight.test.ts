import { describe, it, expect } from 'vitest';
import { highlightMatches } from '../../src/lib/highlight';

describe('highlightMatches', () => {
  it('H-01: query rỗng trả nguyên text, match false', () => {
    expect(highlightMatches('Hello', '')).toEqual([{ text: 'Hello', match: false }]);
  });

  it('H-02: query không xuất hiện trả nguyên text, match false', () => {
    expect(highlightMatches('Hello', 'zzz')).toEqual([{ text: 'Hello', match: false }]);
  });

  it('H-03: query khớp giữa text tách thành 3 đoạn', () => {
    expect(highlightMatches('Hello World', 'lo Wo')).toEqual([
      { text: 'Hel', match: false },
      { text: 'lo Wo', match: true },
      { text: 'rld', match: false },
    ]);
  });

  it('H-04: query khớp nhiều lần', () => {
    expect(highlightMatches('ab ab', 'ab')).toEqual([
      { text: 'ab', match: true },
      { text: ' ', match: false },
      { text: 'ab', match: true },
    ]);
  });

  it('H-05: text rỗng trả mảng rỗng', () => {
    expect(highlightMatches('', 'abc')).toEqual([]);
  });
});
