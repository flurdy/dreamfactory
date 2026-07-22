import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const playBaseUrl = process.env.PLAY_BASE_URL || 'http://127.0.0.1:9000';
const staticBaseUrl = process.env.STATIC_BASE_URL || 'http://127.0.0.1:4176';
const threshold = Number(process.env.VISUAL_DIFF_THRESHOLD || '1');
const sizes = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 900 },
];

function imageDimensions(file) {
  const result = spawnSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Could not identify ${file}: ${result.stderr}`);
  return result.stdout.trim().split(' ').map(Number);
}

function compareImages(playPath, staticPath) {
  const playDimensions = imageDimensions(playPath);
  const staticDimensions = imageDimensions(staticPath);
  assert.deepEqual(staticDimensions, playDimensions, 'Play and static homepage screenshots have different dimensions');
  const result = spawnSync('compare', ['-metric', 'AE', playPath, staticPath, 'null:'], { encoding: 'utf8' });
  const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
  const normalizedCount = output.match(/\((\d+)\)/)?.[1];
  assert.ok(normalizedCount, `Could not parse ImageMagick comparison output: ${output}`);
  const differentPixels = Number(normalizedCount);
  return { differentPixels, percent: differentPixels * 100 / (playDimensions[0] * playDimensions[1]) };
}

async function capture(page, url, outputPath, desktop) {
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${url} did not return 200`);
  const randomProjects = page.locator('.project-list-box').filter({
    has: page.getByRole('heading', { name: 'Random', exact: true }),
  });
  await randomProjects.locator('.project-summary-title').first().waitFor({ state: 'visible' });
  if (desktop) {
    await page.locator('#nautical-deck .newsbar-list:visible').waitFor({ state: 'visible' });
  } else {
    await page.locator('#nautical-deck .newsbar summary').waitFor({ state: 'visible' });
  }
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll('*')) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const dashboardTitles = await page.locator('.dashboard-grid .project-summary-title').allTextContents();
  await page.screenshot({ path: outputPath, type: 'png', fullPage: true, timeout: 120000 });
  return dashboardTitles;
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'dreamfactory-homepage-parity-'));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
});

try {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    const playPage = await context.newPage();
    const staticPage = await context.newPage();
    await staticPage.route('**/random-projects*.js*', route => route.abort());
    const playPath = join(outputDirectory, `homepage-${size.name}-play.png`);
    const staticPath = join(outputDirectory, `homepage-${size.name}-static.png`);
    const playTitles = await capture(playPage, `${playBaseUrl}/`, playPath, size.width > 1000);
    const staticTitles = await capture(staticPage, `${staticBaseUrl}/`, staticPath, size.width > 1000);
    assert.deepEqual(
      playTitles,
      staticTitles,
      'Homepage project fixtures differ; start Play with DREAMFACTORY_DETERMINISTIC_HOMEPAGE=true',
    );
    const result = compareImages(playPath, staticPath);
    console.log(`homepage ${size.name}: ${result.differentPixels} pixels differ (${result.percent.toFixed(2)}%)`);
    assert.ok(result.percent <= threshold, `homepage ${size.name} visual difference exceeds ${threshold}%`);
    await context.close();
  }
  console.log(`Homepage is within ${threshold}% at desktop and mobile widths.`);
} finally {
  await browser.close();
  if (process.env.KEEP_VISUAL_OUTPUT) console.log(`Screenshots: ${outputDirectory}`);
  else rmSync(outputDirectory, { recursive: true, force: true });
}
