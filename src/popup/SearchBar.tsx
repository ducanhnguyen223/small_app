import { useEffect, useState } from 'react';
import { CATEGORIES } from '../lib/types';
import type { Category, Filters } from '../lib/types';

type Props = {
  onFiltersChange: (filters: Filters) => void;
  allTags: string[];
};

type Preset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function presetRange(preset: Preset, now: number): { from?: number; to?: number } {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now) };
    case '7d':
      return { from: now - 7 * 24 * 60 * 60 * 1000 };
    case '30d':
      return { from: now - 30 * 24 * 60 * 60 * 1000 };
    case 'month': {
      const d = new Date(now);
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    }
    default:
      return {};
  }
}

export function SearchBar({ onFiltersChange, allTags }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const range =
        preset === 'custom'
          ? {
              from: customFrom ? new Date(customFrom).getTime() : undefined,
              to: customTo ? new Date(customTo).getTime() : undefined,
            }
          : presetRange(preset, Date.now());

      onFiltersChange({
        text: text.trim() || undefined,
        category: category || undefined,
        tags: activeTags.length > 0 ? activeTags : undefined,
        ...range,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, category, activeTags, preset, customFrom, customTo, onFiltersChange]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <input
        aria-label="Tìm kiếm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm theo tiêu đề hoặc nội dung"
        className="w-full rounded border px-2 py-1"
      />

      <select
        aria-label="Lọc phân loại"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category | '')}
        className="w-full rounded border px-2 py-1"
      >
        <option value="">Tất cả phân loại</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-sm ${
                activeTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <select
        aria-label="Khoảng thời gian"
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        className="w-full rounded border px-2 py-1"
      >
        <option value="all">Mọi lúc</option>
        <option value="today">Hôm nay</option>
        <option value="7d">7 ngày gần nhất</option>
        <option value="30d">30 ngày gần nhất</option>
        <option value="month">Tháng này</option>
        <option value="custom">Tuỳ chỉnh</option>
      </select>

      {preset === 'custom' && (
        <div className="flex gap-2">
          <input
            aria-label="Từ ngày"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            aria-label="Đến ngày"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </div>
      )}
    </div>
  );
}
