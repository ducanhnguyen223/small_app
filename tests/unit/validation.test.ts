import { describe, it, expect } from 'vitest';
import { validateEntry } from '../../src/lib/validation';
import type { EntryDraft } from '../../src/lib/types';

const NOW = 1_700_000_000_000;

function draft(overrides: Partial<EntryDraft> = {}): EntryDraft {
  return { title: 'Bài hay', category: 'blog', tags: [], ...overrides };
}

describe('validateEntry', () => {
  it('U-V01: draft hợp lệ không có lỗi', () => {
    expect(validateEntry(draft(), NOW)).toEqual({});
  });

  it.each([
    ['U-V02 title rỗng', { title: '' }, 'title', 'Tiêu đề không được để trống'],
    ['U-V03 title toàn khoảng trắng', { title: '   ' }, 'title', 'Tiêu đề không được để trống'],
    ['U-V05 title 201 ký tự', { title: 'a'.repeat(201) }, 'title', 'Tiêu đề tối đa 200 ký tự'],
    ['U-V06 category sai', { category: 'random' as never }, 'category', 'Phải chọn phân loại'],
    ['U-V08 content 5001 ký tự', { content: 'a'.repeat(5001) }, 'content', 'Nội dung tối đa 5000 ký tự'],
    ['U-V10 11 thẻ', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }, 'tags', 'Tối đa 10 thẻ'],
    ['U-V11 thẻ 31 ký tự', { tags: ['a'.repeat(31)] }, 'tags', 'Mỗi thẻ tối đa 30 ký tự'],
    ['U-V13 url rác', { sourceUrl: 'khong-phai-url' }, 'sourceUrl', 'URL không hợp lệ'],
    ['U-V14 url ftp', { sourceUrl: 'ftp://a.com' }, 'sourceUrl', 'URL không hợp lệ'],
    ['U-V16 nhắc trong quá khứ', { reminderAt: NOW - 1000 }, 'reminderAt', 'Thời điểm nhắc phải ở tương lai'],
  ])('%s', (_name, overrides, field, message) => {
    const errors = validateEntry(draft(overrides as Partial<EntryDraft>), NOW);
    expect(errors[field as keyof typeof errors]).toBe(message);
  });

  it.each([
    ['U-V04 title đúng 200 ký tự', { title: 'a'.repeat(200) }, 'title'],
    ['U-V07 content đúng 5000 ký tự', { content: 'a'.repeat(5000) }, 'content'],
    ['U-V09 đúng 10 thẻ', { tags: Array.from({ length: 10 }, (_, i) => `t${i}`) }, 'tags'],
    ['U-V12 url hợp lệ', { sourceUrl: 'https://a.com/x' }, 'sourceUrl'],
    ['U-V15 nhắc ở tương lai', { reminderAt: NOW + 1000 }, 'reminderAt'],
  ])('%s: không báo lỗi ở biên', (_name, overrides, field) => {
    const errors = validateEntry(draft(overrides as Partial<EntryDraft>), NOW);
    expect(errors[field as keyof typeof errors]).toBeUndefined();
  });

  it('U-V17: gom nhiều lỗi cùng lúc', () => {
    const errors = validateEntry(draft({ title: '', category: 'random' as never }), NOW);
    expect(errors.title).toBeDefined();
    expect(errors.category).toBeDefined();
  });
});
