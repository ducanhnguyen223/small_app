import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderList } from '../../src/popup/ReminderList';
import type { Entry } from '../../src/lib/types';

const NOW = 1_700_000_000_000;

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'a',
    title: 'Bài hay',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    reminderAt: NOW + 60_000,
    ...overrides,
  };
}

describe('ReminderList', () => {
  it('RL-01: không có reminder nào thì hiện trạng thái rỗng', () => {
    render(<ReminderList entries={[]} now={() => NOW} onSnooze={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText('Không có nhắc nhở nào')).toBeInTheDocument();
  });

  it('RL-02: có reminder thì hiện title', () => {
    render(
      <ReminderList entries={[entry()]} now={() => NOW} onSnooze={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Bài hay')).toBeInTheDocument();
  });

  it('RL-03: click "+15 phút" gọi onSnooze đúng id và thời điểm mới', async () => {
    const onSnooze = vi.fn().mockResolvedValue(undefined);
    render(
      <ReminderList
        entries={[entry({ id: 'a' })]}
        now={() => NOW}
        onSnooze={onSnooze}
        onSelect={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '+15 phút' }));
    expect(onSnooze).toHaveBeenCalledWith('a', NOW + 15 * 60 * 1000);
  });

  it('RL-04: click title gọi onSelect với đúng entry', async () => {
    const onSelect = vi.fn();
    const e = entry();
    render(<ReminderList entries={[e]} now={() => NOW} onSnooze={vi.fn()} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Bài hay'));
    expect(onSelect).toHaveBeenCalledWith(e);
  });
});
