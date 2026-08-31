import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const EXTENSION_PATH = path.resolve('dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-diary-e4-'));
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

test('E-04: tạo entry rồi xuất ra file JSON đúng nội dung', async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await popup.getByLabel('Tiêu đề').fill('Bài viết E2E Export');
  await popup.getByLabel('Phân loại').selectOption('blog');
  await popup.getByRole('button', { name: 'Lưu' }).click();
  await expect(popup.getByText('Bài viết E2E Export')).toBeVisible();

  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  const [download] = await Promise.all([
    optionsPage.waitForEvent('download'),
    optionsPage.getByRole('button', { name: 'Xuất ra JSON' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain('reading-diary-export-');

  const filePath = await download.path();
  const content = fs.readFileSync(filePath as string, 'utf-8');
  const parsed = JSON.parse(content);
  expect(parsed.version).toBe('1.0');
  expect(parsed.entries.some((e: { title: string }) => e.title === 'Bài viết E2E Export')).toBe(
    true,
  );
});
