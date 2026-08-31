import type { Entry, Filters } from './types';

export function filterEntries(entries: Entry[], filters: Filters): Entry[] {
  return entries.filter((entry) => matchesFilters(entry, filters));
}

function matchesFilters(entry: Entry, filters: Filters): boolean {
  if (filters.category && entry.category !== filters.category) return false;

  if (filters.tags && filters.tags.length > 0) {
    const hasAnyTag = filters.tags.some((tag) => entry.tags.includes(tag));
    if (!hasAnyTag) return false;
  }

  if (filters.from !== undefined && entry.createdAt < filters.from) return false;
  if (filters.to !== undefined && entry.createdAt > filters.to) return false;

  if (filters.text) {
    const needle = filters.text.trim().toLowerCase();
    if (needle) {
      const haystack = `${entry.title} ${entry.content ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
  }

  return true;
}
