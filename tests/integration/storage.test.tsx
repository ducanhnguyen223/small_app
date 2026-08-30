import { describe, it, expect, vi, afterEach } from 'vitest';
import { installFakeChrome } from '../helpers/fakeChrome';
import { chromeStorage, onEntriesChanged } from '../../src/storage';
import type { Entry } from '../../src/lib/types';

const sample: Entry = {
  id: 'id-1',
  title: 'Bài hay',
  category: 'blog',
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chromeStorage', () => {
  it('I-ST01: load trả mảng rỗng khi chưa có gì', async () => {
    installFakeChrome();
    expect(await chromeStorage.load()).toEqual([]);
  });

  it('I-ST02: load đọc được mảng đã lưu', async () => {
    installFakeChrome({ entries: [sample] });
    expect(await chromeStorage.load()).toEqual([sample]);
  });

  it('I-ST03: load trả mảng rỗng khi dữ liệu hỏng', async () => {
    installFakeChrome({ entries: 'khong-phai-mang' });
    expect(await chromeStorage.load()).toEqual([]);
  });

  it('I-ST04: save ghi vào key entries', async () => {
    const { store } = installFakeChrome();
    await chromeStorage.save([sample]);
    expect(store.entries).toEqual([sample]);
  });
});

describe('onEntriesChanged', () => {
  it('I-ST05: gọi callback khi key entries đổi', async () => {
    installFakeChrome();
    const spy = vi.fn();
    onEntriesChanged(spy);
    await chromeStorage.save([sample]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('I-ST06: hàm huỷ gỡ được listener', async () => {
    installFakeChrome();
    const spy = vi.fn();
    const unsubscribe = onEntriesChanged(spy);
    unsubscribe();
    await chromeStorage.save([sample]);
    expect(spy).not.toHaveBeenCalled();
  });
});
