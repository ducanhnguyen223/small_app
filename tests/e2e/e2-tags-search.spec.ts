import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e2-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('E-02: gắn tag rồi tìm lại bằng search', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E Search');
  await page.getByLabel('Phân loại').selectOption('blog');
  await page.getByLabel('Thêm thẻ').fill('smoke');
  await page.getByLabel('Thêm thẻ').press('Enter');
  await page.getByRole('button', { name: 'Lưu' }).click();

  await expect(page.getByText('Bài viết E2E Search')).toBeVisible();

  await page.getByLabel('Tìm kiếm').fill('Search');
  await page.waitForTimeout(400);
  await expect(page.getByText('Bài viết E2E Search')).toBeVisible();

  await page.getByLabel('Tìm kiếm').fill('khong-ton-tai');
  await page.waitForTimeout(400);
  await expect(page.getByText('Bài viết E2E Search')).not.toBeVisible();
});
