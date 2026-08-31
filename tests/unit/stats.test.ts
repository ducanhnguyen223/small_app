import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/lib/stats';
import type { Entry } from '../../src/lib/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: Math.random().toString(36),
    title: 'Bài',
    category: 'blog',
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('computeStats', () => {
  it('S-01: total đúng tổng số', () => {
    const stats = computeStats([entry(), entry(), entry()], NOW);
    expect(stats.total).toBe(3);
  });

  it('S-02: thisWeek đếm đúng trong 7 ngày', () => {
    const entries = [entry({ createdAt: NOW - 3 * DAY }), entry({ createdAt: NOW - 10 * DAY })];
    expect(computeStats(entries, NOW).thisWeek).toBe(1);
  });

  it('S-03: thisWeek biên inclusive đúng 7 ngày trước', () => {
    const entries = [entry({ createdAt: NOW - 7 * DAY })];
    expect(computeStats(entries, NOW).thisWeek).toBe(1);
  });

  it('S-04: topCategories sắp xếp giảm dần, tối đa 5', () => {
    const cats: Entry['category'][] = ['email', 'news', 'blog', 'social', 'other'];
    const entries = [
      ...Array.from({ length: 5 }, () => entry({ category: 'email' })),
      ...Array.from({ length: 3 }, () => entry({ category: 'news' })),
      ...cats.slice(2).map((c) => entry({ category: c })),
    ];
    const top = computeStats(entries, NOW).topCategories;
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top[0]).toEqual({ category: 'email', count: 5 });
  });

  it('S-05: topTags sắp xếp giảm dần, tối đa 5', () => {
    const built = [
      entry({ tags: ['popular'] }),
      entry({ tags: ['popular'] }),
      entry({ tags: ['popular'] }),
      entry({ tags: ['rare'] }),
      entry({ tags: ['t3'] }),
      entry({ tags: ['t4'] }),
      entry({ tags: ['t5'] }),
      entry({ tags: ['t6'] }),
    ];
    const top = computeStats(built, NOW).topTags;
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top[0]).toEqual({ tag: 'popular', count: 3 });
  });

  it('S-06: streak 0 khi không có entry hôm nay', () => {
    const entries = [entry({ createdAt: NOW - 2 * DAY })];
    expect(computeStats(entries, NOW).streak).toBe(0);
  });

  it('S-07: streak đếm đúng chuỗi ngày liên tục', () => {
    const entries = [
      entry({ createdAt: NOW }),
      entry({ createdAt: NOW - DAY }),
      entry({ createdAt: NOW - 2 * DAY }),
    ];
    expect(computeStats(entries, NOW).streak).toBe(3);
  });

  it('S-08: streak dừng khi có khoảng trống', () => {
    const entries = [entry({ createdAt: NOW }), entry({ createdAt: NOW - 2 * DAY })];
    expect(computeStats(entries, NOW).streak).toBe(1);
  });
});
