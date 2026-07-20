import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const playBaseUrl = process.env.PLAY_BASE_URL || 'http://127.0.0.1:9000';
const staticBaseUrl = process.env.STATIC_BASE_URL || 'http://127.0.0.1:4176';
const threshold = Number(process.env.VISUAL_DIFF_THRESHOLD || '1');
const projects = [
  { name: 'gatehouse', path: 'gatehouse' },
  { name: 'bad-usernames', path: 'bad_usernames' },
  { name: 'gift-registry', path: 'Gift%20Registry' }
];
const sizes = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 900 }
];

function imageDimensions(path) {
  const result = spawnSync('identify', ['-format', '%w %h', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Could not identify ${path}: ${result.stderr}`);
  return result.stdout.trim().split(' ').map(Number);
}

function compareImages(playPath, staticPath) {
  const playDimensions = imageDimensions(playPath);
  const staticDimensions = imageDimensions(staticPath);
  assert.deepEqual(staticDimensions, playDimensions, 'Play and static full-page screenshots have different dimensions');
  const totalPixels = playDimensions[0] * playDimensions[1];
  const result = spawnSync('compare', ['-metric', 'AE', playPath, staticPath, 'null:'], { encoding: 'utf8' });
  const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
  const normalizedCount = output.match(/\((\d+)\)/)?.[1];
  assert.ok(normalizedCount, `Could not parse ImageMagick comparison output: ${output}`);
  const differentPixels = Number(normalizedCount);
  return { differentPixels, percent: (differentPixels * 100) / totalPixels };
}

async function preparePage(page, url) {
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${url} did not return 200`);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll('*')) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }
  });
}

async function capture(page, url, path, desktop) {
  await preparePage(page, url);
  if (desktop) {
    await page.locator('#nautical-deck .newsbar-list:visible').waitFor({ state: 'visible' });
  } else {
    await page.locator('#nautical-deck .newsbar summary').waitFor({ state: 'visible' });
  }
  await page.screenshot({ path, type: 'png', fullPage: true });
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'dreamfactory-visual-parity-'));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome'
});

try {
  for (const project of projects) {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const playPath = join(outputDirectory, `${project.name}-${size.name}-play.png`);
      const staticPath = join(outputDirectory, `${project.name}-${size.name}-static.png`);
      await capture(page, `${playBaseUrl}/project/${project.path}`, playPath, size.width > 1000);
      await capture(page, `${staticBaseUrl}/project/${project.path}`, staticPath, size.width > 1000);
      const result = compareImages(playPath, staticPath);
      console.log(`${project.name} ${size.name}: ${result.differentPixels} pixels differ (${result.percent.toFixed(2)}%)`);
      assert.ok(result.percent <= threshold, `${project.name} ${size.name} visual difference exceeds ${threshold}%`);
      await context.close();
    }
  }
  console.log(`All three project slices are within ${threshold}% at both widths.`);
} finally {
  await browser.close();
  rmSync(outputDirectory, { recursive: true, force: true });
}
