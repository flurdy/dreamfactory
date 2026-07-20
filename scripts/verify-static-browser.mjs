import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const composeArgs = ['compose', '-f', 'static-site/docker-compose.yml'];
const baseUrl = 'http://localhost:4176';

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

async function assertNoBlockingA11y(page, label) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  const details = blocking.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
  assert.deepEqual(details, [], `${label} has blocking accessibility violations`);
}

run('scripts/verify-static-site.sh', []);
run('docker', [...composeArgs, 'up', '--detach', '--force-recreate']);

let browser;
try {
  run('curl', [
    '--fail', '--silent', '--show-error', '--retry', '30', '--retry-all-errors',
    '--retry-delay', '1', '--output', '/dev/null', baseUrl
  ]);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome'
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const catalog = await (await fetch(`${baseUrl}/data/projects.json`)).json();
  await page.addInitScript(() => {
    window.__dreamFactoryRandom = () => {
      const next = Number(sessionStorage.getItem('rngCalls') || '0') + 1;
      sessionStorage.setItem('rngCalls', String(next));
      return ((next * 37) % 100) / 100;
    };
  });

  await page.goto(`${baseUrl}/`);
  await page.waitForFunction(() => document.querySelector('#random-projects')?.dataset.randomized === 'true');
  assert.equal(await page.locator('#nautical-lookout').count(), 0);
  assert.equal(await page.locator('#home-search.form-control').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Mothballed or abandoned' }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Development status' }).count(), 1);
  assert.equal(await page.getByRole('link', { name: 'Not started' }).count(), 1);
  assert.equal(await page.locator('.dashboard-grid .project-summary-url').count(), 34);
  assert.ok(await page.locator('.dashboard-grid .project-statuses').count() > 0);
  await assertNoBlockingA11y(page, 'Home page');
  const firstRandom = await page.locator('#random-projects .project-summary-title').allTextContents();
  assert.equal(firstRandom.length, 10);
  const randomState = await page.evaluate(async () => {
    const catalog = await (await fetch('/data/projects.json')).json();
    const selected = Array.from(document.querySelectorAll('#random-projects .project-summary-title')).map((node) => node.textContent);
    const selectedProjects = catalog.projects.filter((project) => selected.includes(project.title));
    return {
      excluded: selectedProjects.filter((project) => catalog.home.randomExcludedLinks.includes(project.link)).map((project) => project.link),
      healthy: selectedProjects.filter((project) => !project.derived.dead && !project.derived.unlikely && !project.derived.stale).length
    };
  });
  assert.deepEqual(randomState.excluded, []);
  assert.ok(randomState.healthy >= 7);

  await page.reload();
  await page.waitForFunction(() => document.querySelector('#random-projects')?.dataset.randomized === 'true');
  const secondRandom = await page.locator('#random-projects .project-summary-title').allTextContents();
  assert.notDeepEqual(secondRandom, firstRandom);

  const entityTitlePage = await context.newPage();
  await entityTitlePage.addInitScript(() => { window.__dreamFactoryRandom = () => 0.25074925074925075; });
  await entityTitlePage.goto(`${baseUrl}/`);
  await entityTitlePage.waitForFunction(() => document.querySelector('#random-projects')?.dataset.randomized === 'true');
  const entityTitles = await entityTitlePage.locator('#random-projects .project-summary-title').allTextContents();
  assert.ok(entityTitles.includes('Baby\u00a0Crowd\u00a0Monitor'));
  assert.ok(entityTitles.every((title) => !title.includes('&nbsp;')));
  await entityTitlePage.close();

  await page.goto(`${baseUrl}/projects/search`);
  const search = page.getByRole('searchbox', { name: 'Search projects' });
  await search.fill('dreamfactory');
  await search.press('Enter');
  await page.waitForFunction(() => document.querySelector('#catalog-count')?.textContent === '1 project');
  assert.equal(await page.locator('#catalog-count').textContent(), '1 project');
  assert.equal(await search.inputValue(), 'dreamfactory');
  assert.equal(await page.locator('#catalog-heading').textContent(), 'Projects containing “dreamfactory”');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'catalog-results-heading');
  await assertNoBlockingA11y(page, 'Search results page');

  await page.goto(`${baseUrl}/projects/search?searchterm=dreamfactory&filter.live=require`);
  await page.waitForFunction(() => document.querySelector('#catalog-count')?.textContent !== 'Loading projects…');
  assert.deepEqual(
    await page.locator('#catalog-results .project-summary-title').allTextContents(),
    catalog.oracle.searchDreamfactoryLiveTitles
  );

  await page.goto(`${baseUrl}/projects/tech?tech=scala&filter.live=require`);
  await page.waitForFunction(() => document.querySelector('#catalog-count')?.textContent !== 'Loading projects…');
  assert.deepEqual(
    await page.locator('#catalog-results .project-summary-title').allTextContents(),
    catalog.oracle.scalaLiveTitles
  );
  assert.equal(await page.locator('#catalog-heading').textContent(), 'Projects with technology: scala');

  await page.goto(`${baseUrl}/projects/characteristic/type/complexity/characteristic/easy`);
  await page.waitForFunction(() => document.querySelector('#catalog-count')?.textContent !== 'Loading projects…');
  assert.deepEqual(
    await page.locator('#catalog-results .project-summary-title').allTextContents(),
    catalog.oracle.easyComplexityTitles
  );
  assert.equal(await page.locator('#catalog-heading').textContent(), 'Projects with complexity: easy');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/project/gatehouse`);
  await assert.doesNotReject(page.getByRole('heading', { name: 'News' }).waitFor());
  assert.deepEqual(await page.locator('#nautical-cargo h2, #nautical-cargo h3').allTextContents(), [
    'Gate House',
    'Dates',
    'Characteristics',
    'Tags',
    'News',
    'Comments',
    'Contact'
  ]);
  assert.equal(await page.getByRole('link', { name: 'Not started' }).textContent(), 'Not started');
  assert.equal(await page.locator('.timeline-list').first().locator('dt').first().textContent(), '2023-Mar-21');
  assert.equal(await page.locator('#nautical-deck .newsbar-list:visible').count(), 1);
  assert.equal(await page.locator('#nautical-deck .newsbar-list:visible > li').count(), 26);
  await assertNoBlockingA11y(page, 'Project detail page');

  await page.setViewportSize({ width: 375, height: 900 });
  const mobileNewsSummary = page.locator('#nautical-deck .newsbar--mobile summary');
  assert.equal(await mobileNewsSummary.isVisible(), true);
  assert.equal(await page.locator('#nautical-deck .newsbar-list:visible').count(), 0);
  await mobileNewsSummary.click();
  assert.equal(await page.locator('#nautical-deck .newsbar-list:visible > li').count(), 26);
  await assertNoBlockingA11y(page, 'Expanded mobile project news');

  const missing = await page.goto(`${baseUrl}/project/DOES-NOT-EXIST`);
  assert.equal(missing.status(), 404);
  await assert.doesNotReject(page.getByRole('heading', { name: 'Page not found' }).waitFor());

  console.log('Static-site browser proof verified.');
} finally {
  if (browser) await browser.close();
  run('docker', [...composeArgs, 'down']);
}
