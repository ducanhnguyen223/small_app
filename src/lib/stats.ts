import type { Category, Entry } from './types';

export type Stats = {
  total: number;
  thisWeek: number;
  topCategories: { category: Category; count: number }[];
  topTags: { tag: string; count: number }[];
  streak: number;
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeStats(entries: Entry[], now: number = Date.now()): Stats {
  const total = entries.length;

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = entries.filter((e) => e.createdAt >= weekAgo).length;

  const categoryCounts = new Map<Category, number>();
  const tagCounts = new Map<string, number>();
  entries.forEach((e) => {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
    e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
  });

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const daysWithEntry = new Set(entries.map((e) => startOfDay(e.createdAt)));
  let streak = 0;
  let cursor = startOfDay(now);
  while (daysWithEntry.has(cursor)) {
    streak += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }

  return { total, thisWeek, topCategories, topTags, streak };
}
