import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e3-'));
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

test('E-03: đặt nhắc nhở thì thấy trong tab Nhắc nhở', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await page.getByLabel('Tiêu đề').fill('Bài viết E2E Reminder');
  await page.getByLabel('Phân loại').selectOption('blog');

  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const value = `${oneHourLater.getFullYear()}-${pad(oneHourLater.getMonth() + 1)}-${pad(oneHourLater.getDate())}T${pad(oneHourLater.getHours())}:${pad(oneHourLater.getMinutes())}`;
  await page.getByLabel('Nhắc nhở').fill(value);

  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Bài viết E2E Reminder')).toBeVisible();

  await page.getByRole('button', { name: 'Nhắc nhở' }).click();
  await expect(page.getByText('Bài viết E2E Reminder')).toBeVisible();
  await expect(page.getByRole('button', { name: '+15 phút' })).toBeVisible();
});
