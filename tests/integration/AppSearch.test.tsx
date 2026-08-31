import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeChrome } from '../helpers/fakeChrome';
import App from '../../src/popup/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App + SearchBar wiring', () => {
  it('A-01: gõ text khớp 1 entry thì EntryList chỉ còn entry đó', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'React Hooks', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
        { id: '2', title: 'Vue Composition', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
      ],
    });
    render(<App />);

    expect(await screen.findByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('Vue Composition')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Tìm kiếm'), 'React');
    await new Promise((r) => setTimeout(r, 350));

    // Title bị chia thành <mark>React</mark><span> Hooks</span> do highlight (Task 6),
    // getByText mặc định chỉ so text node trực tiếp nên cần matcher theo textContent.
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'React Hooks'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Vue Composition')).not.toBeInTheDocument();
  });

  it('A-02: xoá hết text tìm kiếm thì hiện lại toàn bộ', async () => {
    installFakeChrome({
      entries: [
        { id: '1', title: 'React Hooks', category: 'blog', tags: [], createdAt: 2000, updatedAt: 2000 },
        { id: '2', title: 'Vue Composition', category: 'blog', tags: [], createdAt: 1000, updatedAt: 1000 },
      ],
    });
    render(<App />);
    await screen.findByText('React Hooks');

    const search = screen.getByLabelText('Tìm kiếm');
    await userEvent.type(search, 'React');
    await new Promise((r) => setTimeout(r, 350));
    await userEvent.clear(search);
    await new Promise((r) => setTimeout(r, 350));

    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('Vue Composition')).toBeInTheDocument();
  });
});
