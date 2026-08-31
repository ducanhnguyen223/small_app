import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import { EntryList } from '../../src/popup/EntryList';
import type { Entry } from '../../src/lib/types';

describe('EntryForm + TagInput wiring', () => {
  it('W-01: gõ tag qua TagInput rồi Lưu, onSubmit nhận đúng tags', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['react'] }));
  });
});

describe('EntryList + highlight wiring', () => {
  const entries: Entry[] = [
    {
      id: 'id-1',
      title: 'React Hooks cơ bản',
      category: 'blog',
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('W-02: có highlightQuery khớp title thì bọc <mark>', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} highlightQuery="Hooks" />);
    const mark = document.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('Hooks');
  });

  it('W-03: không có highlightQuery thì không có <mark>', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(document.querySelector('mark')).toBeNull();
  });
});
