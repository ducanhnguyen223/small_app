import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
  window.history.pushState({}, '', '/');
});

/** Import App AFTER installing fake chrome to ensure store uses the fake chrome. */
async function renderApp() {
  const { default: App } = await import('../../src/popup/App');
  return render(<App />);
}

describe('App reminders tab', () => {
  it('AR-01: click tab Nhắc nhở thì hiện ReminderList thay EntryList', async () => {
    installFakeChrome({
      entries: [
        {
          id: '1',
          title: 'Có nhắc nhở',
          category: 'blog',
          tags: [],
          createdAt: 1000,
          updatedAt: 1000,
          reminderAt: Date.now() + 60_000,
        },
      ],
    });
    await renderApp();
    await screen.findByText('Có nhắc nhở');

    await userEvent.click(screen.getByRole('button', { name: 'Nhắc nhở' }));

    expect(screen.getByRole('button', { name: '+15 phút' })).toBeInTheDocument();
  });
});

describe('App deep link', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?entryId=1');
  });

  it('AR-02: URL có entryId thì mở form sửa đúng entry đó', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'Entry mục tiêu', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
        { id: '2', title: 'Entry khác', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
      ],
    });
    await renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Entry mục tiêu');
    });
  });
});
