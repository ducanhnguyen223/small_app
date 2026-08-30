import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';

// Unmount trước khi tháo fake chrome — App có effect cleanup gọi chrome.storage.onChanged;
// nếu unstub chạy trước unmount (thứ tự afterEach giữa setup.ts và file test không đảm bảo)
// thì cleanup ấy nổ ReferenceError.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** useDiaryStore được tạo lúc import module, nên fake chrome phải cài TRƯỚC khi import. */
async function renderApp() {
  const { default: App } = await import('../../src/popup/App');
  return render(<App />);
}

describe('popup App', () => {
  it('I-A01: điền sẵn URL tab hiện tại', async () => {
    installFakeChrome();
    await renderApp();
    await waitFor(() => {
      expect(screen.getByLabelText('Nguồn')).toHaveValue('https://example.com/bai-viet');
    });
  });

  it('I-A02: focus vào ô tiêu đề khi mở', async () => {
    installFakeChrome();
    await renderApp();
    expect(document.activeElement).toBe(screen.getByLabelText('Tiêu đề'));
  });

  it('I-A03: lưu entry rồi thấy trong danh sách', async () => {
    installFakeChrome();
    await renderApp();

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Ghi chép đầu tiên');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Ghi chép đầu tiên')).toBeInTheDocument();
  });

  it('I-A04: entry có sẵn trong storage hiện ra khi mount', async () => {
    installFakeChrome({
      entries: [
        {
          id: 'id-1',
          title: 'Đã lưu từ trước',
          category: 'blog',
          tags: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    });
    await renderApp();
    expect(await screen.findByText('Đã lưu từ trước')).toBeInTheDocument();
  });

  it('I-A05: ghi lỗi thì hiện toast và giữ chữ trong form', async () => {
    const fake = installFakeChrome();
    await renderApp();

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Giữ chữ này lại');
    await userEvent.selectOptions(screen.getByLabelText('Phân loại'), 'blog');
    fake.failNextSave();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Không lưu được dữ liệu')).toBeInTheDocument();
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Giữ chữ này lại');
  });
});
