import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Service worker đăng ký xong thì URL của nó chứa extension id
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('E-01: tạo entry và nó tồn tại sau khi tải lại', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E');
  await page.getByLabel('Phân loại').selectOption('blog');
  await page.getByRole('button', { name: 'Lưu' }).click();

  await expect(page.getByText('Bài viết E2E')).toBeVisible();

  // Tải lại chứng minh dữ liệu nằm trong chrome.storage.local, không phải state React
  await page.reload();
  await expect(page.getByText('Bài viết E2E')).toBeVisible();
});
