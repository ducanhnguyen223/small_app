import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../src/popup/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SB-01: gõ text, đợi 300ms thì gọi onFiltersChange', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.type(screen.getByLabelText('Tìm kiếm'), 'react');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: 'react' }),
    );
  });

  it('SB-02: gõ text, mới 100ms thì chưa gọi', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.type(screen.getByLabelText('Tìm kiếm'), 'r');
    vi.advanceTimersByTime(100);

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('SB-03: chọn category thì gọi onFiltersChange sau debounce', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.selectOptions(screen.getByLabelText('Lọc phân loại'), 'blog');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'blog' }),
    );
  });

  it('SB-04: click chọn 1 tag thì gọi onFiltersChange với tags', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={['react', 'vue']} />);

    await user.click(screen.getByRole('button', { name: 'react' }));
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: ['react'] }),
    );
  });

  it('SB-05: chọn preset "7 ngày gần nhất" thì gọi onFiltersChange với from', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onFiltersChange={onFiltersChange} allTags={[]} />);

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '7d');
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: expect.any(Number) }),
    );
  });
});
