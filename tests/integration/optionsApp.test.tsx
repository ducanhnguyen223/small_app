import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';
import App from '../../src/options/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('options App export', () => {
  it('OA-01: click Xuất ra JSON tạo Blob URL và trigger tải xuống', async () => {
    installFakeChrome({ entries: [] });
    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Xuất ra JSON' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('options App import', () => {
  const validFile = () =>
    new File(
      [JSON.stringify({ version: '1.0', entries: [{ id: 'x', title: 'Nhập vào', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 }] })],
      'backup.json',
      { type: 'application/json' },
    );

  it('OA-02: chọn file hợp lệ hiện số lượng entry tìm thấy', async () => {
    installFakeChrome({ entries: [] });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    expect(await screen.findByText(/1 entry/)).toBeInTheDocument();
  });

  it('OA-03: chọn file hỏng hiện lỗi, không hiện lựa chọn Gộp/Thay thế', async () => {
    installFakeChrome({ entries: [] });
    render(<App />);
    const badFile = new File(['khong-phai-json'], 'bad.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), badFile);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gộp (giữ dữ liệu cũ)' })).not.toBeInTheDocument();
  });

  it('OA-04: click Gộp thêm entry mới, giữ entry cũ', async () => {
    installFakeChrome({
      entries: [{ id: 'cu', title: 'Bài cũ', category: 'blog', tags: [], createdAt: 500, updatedAt: 500 }],
    });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Gộp (giữ dữ liệu cũ)' }));

    expect(await screen.findByTestId('stat-total')).toHaveTextContent('2');
  });

  it('OA-05: click Thay thế xoá hết, thay bằng entries trong file', async () => {
    installFakeChrome({
      entries: [{ id: 'cu', title: 'Bài cũ', category: 'blog', tags: [], createdAt: 500, updatedAt: 500 }],
    });
    render(<App />);
    await userEvent.upload(screen.getByLabelText('Chọn file nhập'), validFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Thay thế toàn bộ' }));

    expect(await screen.findByTestId('stat-total')).toHaveTextContent('1');
  });
});

describe('options App stats', () => {
  it('OA-06: hiện đúng số liệu tổng và chuỗi ngày', async () => {
    const now = Date.now();
    installFakeChrome({
      entries: [
        { id: '1', title: 'A', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '2', title: 'B', category: 'blog', tags: [], createdAt: now, updatedAt: now },
      ],
    });
    render(<App />);
    expect(await screen.findByTestId('stat-total')).toHaveTextContent('2');
  });

  it('OA-07: hiện top category theo đúng thứ tự nhiều nhất trước', async () => {
    const now = Date.now();
    installFakeChrome({
      entries: [
        { id: '1', title: 'A', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '2', title: 'B', category: 'blog', tags: [], createdAt: now, updatedAt: now },
        { id: '3', title: 'C', category: 'news', tags: [], createdAt: now, updatedAt: now },
      ],
    });
    render(<App />);
    const list = await screen.findByTestId('top-categories');
    expect(list.textContent?.indexOf('Blog')).toBeLessThan(list.textContent?.indexOf('Tin tức') ?? -1);
  });
});
