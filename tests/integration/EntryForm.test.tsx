import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from '../../src/popup/EntryForm';
import type { Entry } from '../../src/lib/types';

const existing: Entry = {
  id: 'id-1',
  title: 'Bài cũ',
  category: 'news',
  content: 'Nội dung cũ',
  tags: [],
  sourceUrl: 'https://cu.com',
  createdAt: 1000,
  updatedAt: 1000,
};

describe('EntryForm', () => {
  it('I-F01: hiện đủ 5 phân loại', () => {
    render(<EntryForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Phân loại')).toBeInTheDocument();
    ['Email', 'Tin tức', 'Blog', 'Mạng xã hội', 'Khác'].forEach((label) => {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    });
  });

  it('I-F02: chặn submit khi title rỗng', async () => {
    const onSubmit = vi.fn();
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Tiêu đề không được để trống')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('I-F03: submit hợp lệ gọi onSubmit với đúng draft', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={onSubmit} defaultUrl="https://a.com/x" />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Bài mới', category: 'blog', sourceUrl: 'https://a.com/x' }),
    );
  });

  it('I-F04: lỗi được nối vào input qua aria-describedby', async () => {
    render(<EntryForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    const input = screen.getByLabelText('Tiêu đề');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Tiêu đề không được để trống',
    );
  });

  it('I-F05: chế độ sửa điền sẵn giá trị', () => {
    render(<EntryForm initial={existing} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Bài cũ');
    expect(screen.getByLabelText('Phân loại')).toHaveValue('news');
    expect(screen.getByLabelText('Ghi chú')).toHaveValue('Nội dung cũ');
  });

  it('I-F06: onSubmit lỗi thì giữ nguyên chữ đã gõ', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('save failed'));
    render(<EntryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Đừng mất chữ này');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Đừng mất chữ này');
  });
});
