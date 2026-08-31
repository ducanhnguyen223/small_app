import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import type { Entry } from '../../src/lib/types';

describe('EntryForm reminder field', () => {
  it('ERM-01: nhập ngày giờ tương lai rồi Lưu, onSubmit nhận đúng reminderAt', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.type(screen.getByLabelText('Nhắc nhở'), '2099-01-01T10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reminderAt: new Date('2099-01-01T10:00').getTime() }),
    );
  });

  it('ERM-02: bỏ trống field Nhắc nhở, onSubmit nhận reminderAt undefined', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reminderAt: undefined }));
  });

  it('ERM-03: chế độ sửa điền sẵn reminder có sẵn', () => {
    const existing: Entry = {
      id: 'id-1',
      title: 'Cũ',
      category: 'blog',
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
      reminderAt: new Date('2099-06-15T08:30').getTime(),
    };
    render(<EntryForm initial={existing} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Nhắc nhở')).toHaveValue('2099-06-15T08:30');
  });
});
