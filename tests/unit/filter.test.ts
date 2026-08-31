import { describe, it, expect } from 'vitest';
import { filterEntries } from '../../src/lib/filter';
import type { Entry } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id-1',
    title: 'React Hooks cơ bản',
    category: 'blog',
    content: 'Bài viết về useState và useEffect',
    tags: ['react'],
    createdAt: 1500,
    updatedAt: 1500,
    ...overrides,
  };
}

describe('filterEntries', () => {
  it('F-01: filters rỗng trả về toàn bộ', () => {
    const entries = [entry({ id: 'a' }), entry({ id: 'b' })];
    expect(filterEntries(entries, {})).toHaveLength(2);
  });

  it('F-02: text khớp title không phân biệt hoa thường', () => {
    const entries = [entry({ title: 'React Hooks' })];
    expect(filterEntries(entries, { text: 'react' })).toHaveLength(1);
  });

  it('F-03: text không khớp title lẫn content thì loại', () => {
    const entries = [entry({ title: 'React Hooks', content: 'useState' })];
    expect(filterEntries(entries, { text: 'khong-co' })).toHaveLength(0);
  });

  it('F-04: category khớp thì giữ', () => {
    const entries = [entry({ category: 'blog' })];
    expect(filterEntries(entries, { category: 'blog' })).toHaveLength(1);
  });

  it('F-05: category không khớp thì loại', () => {
    const entries = [entry({ category: 'blog' })];
    expect(filterEntries(entries, { category: 'news' })).toHaveLength(0);
  });

  it('F-06: tags OR — khớp 1 trong nhiều tag filter thì giữ', () => {
    const entries = [entry({ tags: ['b'] })];
    expect(filterEntries(entries, { tags: ['a', 'b'] })).toHaveLength(1);
  });

  it('F-07: tags không khớp tag nào thì loại', () => {
    const entries = [entry({ tags: ['a'] })];
    expect(filterEntries(entries, { tags: ['x'] })).toHaveLength(0);
  });

  it('F-08: khoảng ngày inclusive ở cả hai biên', () => {
    const entries = [entry({ id: 'a', createdAt: 1000 }), entry({ id: 'b', createdAt: 2000 })];
    const result = filterEntries(entries, { from: 1000, to: 2000 });
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('F-09: kết hợp nhiều filter dùng AND', () => {
    const entries = [
      entry({ id: 'match', title: 'React Hooks', category: 'blog' }),
      entry({ id: 'partial', title: 'React Hooks', category: 'news' }),
    ];
    const result = filterEntries(entries, { text: 'react', category: 'blog' });
    expect(result.map((e) => e.id)).toEqual(['match']);
  });
});
