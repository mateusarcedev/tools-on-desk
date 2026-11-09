import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function captureScreenshot() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  // Inject Tauri IPC mock so React mounts and renders the full workspace UI
  await page.addInitScript(() => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        if (cmd === 'get_app_info') {
          return { name: 'ToolsOnDesk', version: '0.1.0' };
        }
        if (cmd === 'list_creative_templates') {
          return [];
        }
        if (cmd === 'list_nvidia_models') {
          return [];
        }
        return null;
      },
      metadata: { currentWindow: { label: 'main' } },
    };
    window.__TAURI__ = {
      invoke: window.__TAURI_INTERNALS__.invoke,
      core: { invoke: window.__TAURI_INTERNALS__.invoke },
    };
  });

  const indexPath = path.resolve(__dirname, '../dist/index.html');
  await page.goto('file://' + indexPath, { waitUntil: 'networkidle' });

  // Wait a short moment for fonts, animations and layout
  await page.waitForTimeout(1000);

  const outDir = path.resolve(__dirname, '../test_assets');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'toolsondesk_app_screenshot.png');

  await page.screenshot({ path: outPath });
  console.log('Real screenshot captured at:', outPath);

  await browser.close();
}

captureScreenshot().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
