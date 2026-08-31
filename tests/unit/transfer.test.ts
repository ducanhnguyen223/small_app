import { describe, it, expect } from 'vitest';
import { toExportJSON, parseImport, mergeEntries } from '../../src/lib/transfer';
import type { Entry } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'a',
    title: 'Bài hay',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('toExportJSON', () => {
  it('T-01: đúng shape version/exportedAt/entries', () => {
    const now = 1_700_000_000_000;
    const json = toExportJSON([entry()], now);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBe(new Date(now).toISOString());
    expect(parsed.entries).toEqual([entry()]);
  });
});

describe('parseImport', () => {
  it('T-02: JSON hỏng thì trả lỗi', () => {
    const result = parseImport('khong-phai-json');
    expect(result.ok).toBe(false);
  });

  it('T-03: không phải object thì trả lỗi', () => {
    const result = parseImport('123');
    expect(result.ok).toBe(false);
  });

  it('T-04: thiếu mảng entries thì trả lỗi', () => {
    const result = parseImport('{"version":"1.0"}');
    expect(result.ok).toBe(false);
  });

  it('T-05: entry thiếu field bắt buộc thì trả lỗi', () => {
    const result = parseImport(
      JSON.stringify({ version: '1.0', entries: [{ id: 'a', category: 'blog' }] }),
    );
    expect(result.ok).toBe(false);
  });

  it('T-06: JSON hợp lệ thì trả entries khớp', () => {
    const json = toExportJSON([entry()], 1000);
    const result = parseImport(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entries).toEqual([entry()]);
  });
});

describe('mergeEntries', () => {
  it('T-07: giữ entry cũ, thêm entry mới', () => {
    const existing = [entry({ id: 'a' })];
    const imported = [entry({ id: 'b', title: 'Bài mới' })];
    const result = mergeEntries(existing, imported);
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('T-08: bỏ qua id trùng, giữ bản cũ', () => {
    const existing = [entry({ id: 'x', title: 'Bản cũ' })];
    const imported = [entry({ id: 'x', title: 'Bản mới' })];
    const result = mergeEntries(existing, imported);
    expect(result).toEqual([entry({ id: 'x', title: 'Bản cũ' })]);
  });
});
