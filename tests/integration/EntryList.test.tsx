import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryList } from '../../src/popup/EntryList';
import type { Entry } from '../../src/lib/types';

const entries: Entry[] = [
  { id: 'moi', title: 'Bài mới', category: 'blog', tags: [], createdAt: 3000, updatedAt: 3000 },
  { id: 'cu', title: 'Bài cũ', category: 'news', tags: [], createdAt: 1000, updatedAt: 1000 },
];

describe('EntryList', () => {
  it('I-L01: giữ nguyên thứ tự truyền vào, mới nhất trước', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Bài mới')).toBeInTheDocument();
    expect(within(items[1]).getByText('Bài cũ')).toBeInTheDocument();
  });

  it('I-L02: mỗi dòng hiện title và huy hiệu phân loại', () => {
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const first = screen.getAllByRole('listitem')[0];
    expect(within(first).getByText('Bài mới')).toBeInTheDocument();
    expect(within(first).getByText(/Blog/)).toBeInTheDocument();
  });

  it('I-L03: danh sách rỗng hiện trạng thái rỗng', () => {
    render(<EntryList entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Chưa có ghi chép nào')).toBeInTheDocument();
  });

  it('I-L04: bấm sửa gọi onEdit với đúng entry', async () => {
    const onEdit = vi.fn();
    render(<EntryList entries={entries} onEdit={onEdit} onDelete={vi.fn()} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Sửa' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'moi' }));
  });

  it('I-L05: bấm xoá mở hộp thoại xác nhận, chưa xoá gì', async () => {
    const onDelete = vi.fn();
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('I-L06: xác nhận thì gọi onDelete với đúng id', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }),
    );

    expect(onDelete).toHaveBeenCalledWith('moi');
  });

  it('I-L07: huỷ thì đóng hộp thoại, không xoá', async () => {
    const onDelete = vi.fn();
    render(<EntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);

    const first = screen.getAllByRole('listitem')[0];
    await userEvent.click(within(first).getByRole('button', { name: 'Xoá' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Huỷ' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
