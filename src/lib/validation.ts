import { CATEGORIES } from './types';
import type { EntryDraft, ValidationErrors } from './types';

const CATEGORY_VALUES: string[] = CATEGORIES.map((c) => c.value);

export function validateEntry(draft: EntryDraft, now: number = Date.now()): ValidationErrors {
  const errors: ValidationErrors = {};

  const title = draft.title?.trim() ?? '';
  if (title.length === 0) {
    errors.title = 'Tiêu đề không được để trống';
  } else if (title.length > 200) {
    errors.title = 'Tiêu đề tối đa 200 ký tự';
  }

  if (!CATEGORY_VALUES.includes(draft.category)) {
    errors.category = 'Phải chọn phân loại';
  }

  if (draft.content && draft.content.length > 5000) {
    errors.content = 'Nội dung tối đa 5000 ký tự';
  }

  const tags = draft.tags ?? [];
  if (tags.length > 10) {
    errors.tags = 'Tối đa 10 thẻ';
  } else if (tags.some((t) => t.length > 30)) {
    errors.tags = 'Mỗi thẻ tối đa 30 ký tự';
  }

  if (draft.sourceUrl && !isHttpUrl(draft.sourceUrl)) {
    errors.sourceUrl = 'URL không hợp lệ';
  }

  if (draft.reminderAt !== undefined && draft.reminderAt <= now) {
    errors.reminderAt = 'Thời điểm nhắc phải ở tương lai';
  }

  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
