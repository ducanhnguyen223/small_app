import { describe, it, expect } from 'vitest';
import { createDiaryStore } from '../../src/store/diaryStore';
import type { Entry, EntryDraft, StorageAdapter } from '../../src/lib/types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id-1',
    title: 'Cũ',
    category: 'blog',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function draft(overrides: Partial<EntryDraft> = {}): EntryDraft {
  return { title: 'Mới', category: 'news', tags: [], ...overrides };
}

/** Adapter in-memory. `peek()` để test soi cái gì thực sự được ghi. */
function fakeAdapter(initial: Entry[] = []) {
  let data = [...initial];
  let failing = false;
  const adapter: StorageAdapter & { peek(): Entry[]; fail(): void } = {
    load: async () => {
      if (failing) throw new Error('read failed');
      return [...data];
    },
    save: async (entries) => {
      if (failing) throw new Error('write failed');
      data = [...entries];
    },
    peek: () => data,
    fail: () => {
      failing = true;
    },
  };
  return adapter;
}

const ids = () => {
  let n = 0;
  return () => `id-new-${++n}`;
};

describe('diaryStore', () => {
  it('U-S01: hydrate đọc entry từ adapter', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]));
    await store.getState().hydrate();
    expect(store.getState().entries).toHaveLength(1);
    expect(store.getState().entries[0].title).toBe('Cũ');
  });

  it('U-S02: hydrate sắp xếp mới nhất trước', async () => {
    const store = createDiaryStore(
      fakeAdapter([
        entry({ id: 'a', createdAt: 1000 }),
        entry({ id: 'b', createdAt: 3000 }),
        entry({ id: 'c', createdAt: 2000 }),
      ]),
    );
    await store.getState().hydrate();
    expect(store.getState().entries.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('U-S03: hydrate khi adapter lỗi thì đặt error', async () => {
    const adapter = fakeAdapter();
    adapter.fail();
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    expect(store.getState().error).not.toBeNull();
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().loading).toBe(false);
  });

  it('U-S04: addEntry gán id, createdAt, updatedAt', async () => {
    const store = createDiaryStore(fakeAdapter(), ids(), () => 5000);
    const created = await store.getState().addEntry(draft());
    expect(created.id).toBe('id-new-1');
    expect(created.createdAt).toBe(5000);
    expect(created.updatedAt).toBe(5000);
  });

  it('U-S05: addEntry ghi xuống adapter', async () => {
    const adapter = fakeAdapter();
    const store = createDiaryStore(adapter, ids(), () => 5000);
    await store.getState().addEntry(draft({ title: 'Đã lưu' }));
    expect(adapter.peek()).toHaveLength(1);
    expect(adapter.peek()[0].title).toBe('Đã lưu');
  });

  it('U-S06: addEntry đặt entry mới lên đầu', async () => {
    const store = createDiaryStore(
      fakeAdapter([entry({ id: 'cu', createdAt: 1000 })]),
      ids(),
      () => 9000,
    );
    await store.getState().hydrate();
    await store.getState().addEntry(draft());
    expect(store.getState().entries[0].id).toBe('id-new-1');
  });

  it('U-S07: addEntry khi ghi lỗi thì ném lỗi và hoàn nguyên state', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter, ids(), () => 9000);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().addEntry(draft())).rejects.toThrow();
    expect(store.getState().entries).toHaveLength(1);
    expect(store.getState().entries[0].id).toBe('id-1');
    expect(store.getState().error).not.toBeNull();
  });

  it('U-S08: updateEntry đổi field và bơm updatedAt, giữ createdAt', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]), ids(), () => 7000);
    await store.getState().hydrate();
    await store.getState().updateEntry('id-1', draft({ title: 'Đã sửa' }));

    const updated = store.getState().entries[0];
    expect(updated.title).toBe('Đã sửa');
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(7000);
  });

  it('U-S09: updateEntry với id không tồn tại thì không đổi gì', async () => {
    const store = createDiaryStore(fakeAdapter([entry()]), ids(), () => 7000);
    await store.getState().hydrate();
    await store.getState().updateEntry('khong-co', draft({ title: 'X' }));
    expect(store.getState().entries[0].title).toBe('Cũ');
  });

  it('U-S10: deleteEntry xoá khỏi cả state lẫn adapter', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    await store.getState().deleteEntry('id-1');
    expect(store.getState().entries).toEqual([]);
    expect(adapter.peek()).toEqual([]);
  });

  it('U-S11: deleteEntry khi ghi lỗi thì hoàn nguyên state', async () => {
    const adapter = fakeAdapter([entry()]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().deleteEntry('id-1')).rejects.toThrow();
    expect(store.getState().entries).toHaveLength(1);
  });

  it('U-S12: setAll ghi đè toàn bộ entries', async () => {
    const adapter = fakeAdapter([entry({ id: 'cu' })]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();

    const next = [entry({ id: 'moi-1' }), entry({ id: 'moi-2' })];
    await store.getState().setAll(next);

    expect(store.getState().entries.map((e) => e.id).sort()).toEqual(['moi-1', 'moi-2']);
    expect(adapter.peek().map((e) => e.id).sort()).toEqual(['moi-1', 'moi-2']);
  });

  it('U-S13: setAll khi ghi lỗi thì hoàn nguyên', async () => {
    const adapter = fakeAdapter([entry({ id: 'cu' })]);
    const store = createDiaryStore(adapter);
    await store.getState().hydrate();
    adapter.fail();

    await expect(store.getState().setAll([entry({ id: 'moi' })])).rejects.toThrow();
    expect(store.getState().entries.map((e) => e.id)).toEqual(['cu']);
  });
});
