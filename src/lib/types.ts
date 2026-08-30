export type Category = 'email' | 'news' | 'blog' | 'social' | 'other';

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'news', label: 'Tin tức', icon: '📰' },
  { value: 'blog', label: 'Blog', icon: '📝' },
  { value: 'social', label: 'Mạng xã hội', icon: '💬' },
  { value: 'other', label: 'Khác', icon: '📌' },
];

export type Entry = {
  id: string;
  title: string;
  category: Category;
  content?: string;
  tags: string[];
  sourceUrl?: string;
  reminderAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;

export type ValidationErrors = Partial<Record<keyof EntryDraft, string>>;

export type StorageAdapter = {
  load(): Promise<Entry[]>;
  save(entries: Entry[]): Promise<void>;
};
