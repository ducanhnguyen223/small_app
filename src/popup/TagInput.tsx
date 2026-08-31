import { useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
};

export function TagInput({ tags, onChange, suggestions = [] }: Props) {
  const [input, setInput] = useState('');

  const commit = (raw: string) => {
    const tag = raw.trim();
    setInput('');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(input);
    }
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const trimmed = input.trim();
  const matches =
    trimmed.length >= 2
      ? suggestions.filter(
          (s) => s.toLowerCase().includes(trimmed.toLowerCase()) && !tags.includes(s),
        )
      : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-sm"
          >
            {tag}
            <button
              type="button"
              aria-label={`Xoá thẻ ${tag}`}
              onClick={() => remove(tag)}
              className="text-slate-500 hover:text-slate-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label="Thêm thẻ"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Gõ rồi Enter hoặc dấu phẩy"
        className="w-full rounded border px-2 py-1 text-sm"
      />
      {matches.length > 0 && (
        <ul role="listbox" aria-label="Gợi ý thẻ" className="rounded border bg-white text-sm shadow">
          {matches.map((m) => (
            <li
              key={m}
              role="option"
              aria-selected={false}
              onClick={() => commit(m)}
              className="cursor-pointer px-2 py-1 text-left hover:bg-slate-100"
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
