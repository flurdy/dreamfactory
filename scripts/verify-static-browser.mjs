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

async function waitForCatalog(page) {
  await page.waitForFunction(() => document.querySelector('#catalog-results')?.dataset.catalogEnhanced === 'true');
}

async function visibleCatalogTitles(page) {
  return page.locator('#catalog-results .project-result:not([hidden]) .project-summary-title').allTextContents();
}

run('scripts/verify-static-site.sh', []);
run('docker', [...composeArgs, 'up', '--detach', '--force-recreate']);

let browser;
try {
  run('curl', [
    '--fail', '--silent', '--show-error', '--retry', '30', '--retry-all-errors',
    '--retry-delay', '1', '--output', '/dev/null', baseUrl
  ]);
  run('node', ['scripts/verify-static-route-contract.mjs']);
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
  const themeToggle = page.getByRole('button', { name: 'Dark mode' });
  assert.equal(await themeToggle.count(), 1);
  assert.equal(await themeToggle.getAttribute('aria-pressed'), 'false');
  await themeToggle.click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.getByRole('button', { name: 'Light mode' }).getAttribute('aria-pressed'), 'true');
  await assertNoBlockingA11y(page, 'Home page in dark theme');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByRole('button', { name: 'Light mode' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  const firstRandom = await page.locator('#random-projects .project-summary-title').allTextContents();
  assert.equal(firstRandom.length, 10);
  const randomState = await page.evaluate(async () => {
    const catalogUrl = document.querySelector('#random-projects').dataset.catalog;
    const catalog = await (await fetch(catalogUrl)).json();
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

  await page.goto(`${baseUrl}/projects/`);
  await waitForCatalog(page);
  const expectedProjectTitles = catalog.projects.map((project) => project.title
    .replaceAll('&nbsp;', '\u00a0')
    .replaceAll('&amp;', '&'));
  assert.deepEqual(await page.locator('.project-results .project-summary-title').allTextContents(), expectedProjectTitles);
  assert.equal(await page.locator('.project-results .project-summary-url').count(), catalog.projectCount);
  assert.equal(await page.locator('.project-results .project-status').count(), 175);
  assert.equal(await page.locator('.property-filter').count(), 11);
  assert.equal(await page.locator('.property-filter-any:checked').count(), 11);
  assert.equal(await page.locator('.related-section .chip').count(), catalog.browse.tags.length);
  assert.equal(await page.locator('.discovery-section').first().locator('.chip').count(), catalog.browse.technologies.length);
  assert.equal(await page.evaluate(() => {
    const results = document.querySelector('.results-section').getBoundingClientRect();
    const filters = document.querySelector('.filter-section').getBoundingClientRect();
    return results.bottom <= filters.top;
  }), true);
  await assertNoBlockingA11y(page, 'Projects list page');

  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  const noScriptResponse = await noScriptPage.goto(`${baseUrl}/projects/tech?tech=scala&filter.live=require`);
  assert.equal(noScriptResponse?.status(), 200);
  assert.deepEqual(await noScriptPage.locator('.project-results .project-summary-title').allTextContents(), expectedProjectTitles);
  assert.equal(await noScriptPage.locator('.project-results .project-status').count(), 175);
  assert.equal(await noScriptPage.locator('.project-results .project-summary-url').count(), catalog.projectCount);
  assert.equal(await noScriptPage.locator('.catalog-fallback-message').isVisible(), true);
  await noScriptContext.close();

  await page.goto(`${baseUrl}/projects/search`);
  await waitForCatalog(page);
  const search = page.getByRole('searchbox', { name: 'Search' });
  await search.fill('dreamfactory');
  await search.press('Enter');
  await waitForCatalog(page);
  assert.equal(await page.locator('#catalog-count').textContent(), '1 project');
  assert.equal(await search.inputValue(), 'dreamfactory');
  assert.equal(await page.locator('#catalog-results-heading').textContent(), 'Projects containing search term: “dreamfactory”');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'catalog-results-heading');
  assert.deepEqual(await visibleCatalogTitles(page), ['Dreamfactory']);
  await assertNoBlockingA11y(page, 'Search results page');

  await page.goto(`${baseUrl}/projects/search?searchterm=dreamfactory&filter.live=require`);
  await waitForCatalog(page);
  assert.deepEqual(await visibleCatalogTitles(page), catalog.oracle.searchDreamfactoryLiveTitles);
  assert.equal(await page.locator('[name="filter.live"]:checked').getAttribute('value'), 'require');
  assert.deepEqual(
    await page.locator('#catalog-filter-context input').evaluateAll(inputs => inputs.map(input => [input.name, input.value])),
    [['searchterm', 'dreamfactory']]
  );
  assert.deepEqual(
    await page.locator('#catalog-search-context input').evaluateAll(inputs => inputs.map(input => [input.name, input.value])),
    [['filter.live', 'require']]
  );

  await page.goto(`${baseUrl}/projects/tech?tech=scala&filter.live=require`);
  await waitForCatalog(page);
  assert.deepEqual(await visibleCatalogTitles(page), catalog.oracle.scalaLiveTitles);
  assert.equal(await page.locator('#catalog-results-heading').textContent(), 'Projects with technologies: scala');
  assert.equal(await page.locator('#catalog-results .project-result:not([hidden]) .project-summary-url').count(), 4);
  assert.ok(await page.locator('#catalog-results .project-result:not([hidden]) .project-status').count() > 0);
  assert.equal(await page.locator('#catalog-related .related-section .chip').count(), 10);
  assert.deepEqual(
    await page.locator('#catalog-related .related-section form').first().locator('input').evaluateAll(inputs => inputs.map(input => [input.name, input.value])),
    [['technologies', 'scala'], ['tech', 'play'], ['filter.live', 'require']]
  );

  await page.goto(`${baseUrl}/projects/tags?tags=mobile&tag=commercial`);
  await waitForCatalog(page);
  assert.deepEqual(await visibleCatalogTitles(page), ['TapIn']);
  assert.equal(await page.locator('#catalog-results-heading').textContent(), 'Projects with tags: commercial, mobile');
  assert.equal(new URL(await page.locator('#catalog-filter-form').getAttribute('action'), baseUrl).pathname, '/projects/tags');
  assert.deepEqual(
    await page.locator('#catalog-filter-context input').evaluateAll(inputs => inputs.map(input => [input.name, input.value])),
    [['tag', 'commercial'], ['tags', 'mobile']]
  );

  await page.goto(`${baseUrl}/projects/characteristic/type/complexity/characteristic/low`);
  await waitForCatalog(page);
  assert.deepEqual(await visibleCatalogTitles(page), catalog.oracle.easyComplexityTitles.map(title => title.replaceAll('&amp;', '&')));
  assert.equal(await page.locator('#catalog-results-heading').textContent(), 'Projects with characteristic: Complexity — Easy');
  assert.equal(
    new URL(await page.locator('#catalog-filter-form').getAttribute('action'), baseUrl).pathname,
    '/projects/characteristic/type/complexity/characteristic/easy'
  );
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'catalog-results-heading');
  await assertNoBlockingA11y(page, 'Characteristic alias page');

  await page.goto(`${baseUrl}/projects/search?searchterm=no-such-project`);
  await waitForCatalog(page);
  assert.deepEqual(await visibleCatalogTitles(page), []);
  assert.equal(await page.locator('#catalog-count').textContent(), '0 projects');
  assert.equal(await page.locator('#catalog-empty-results').isVisible(), true);
  assert.equal(await page.locator('#catalog-related .related-section').count(), 0);
  await assertNoBlockingA11y(page, 'Empty catalog results');

  const hostileSearchTerm = '<img id="catalog-injected" src=x>';
  await page.goto(`${baseUrl}/projects/search?searchterm=${encodeURIComponent(hostileSearchTerm)}`);
  await waitForCatalog(page);
  assert.equal(
    await page.locator('#catalog-results-heading').textContent(),
    `Projects containing search term: “${hostileSearchTerm}”`
  );
  assert.equal(await page.locator('#catalog-injected').count(), 0);
  assert.equal(await page.locator('#catalog-search').inputValue(), hostileSearchTerm);

  await page.goto(`${baseUrl}/projects/tech?tech=scala&filter.live=require`);
  await waitForCatalog(page);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'Clear filters' }).click(),
  ]);
  await waitForCatalog(page);
  assert.equal(page.url(), `${baseUrl}/projects/tech?tech=scala`);
  assert.equal(await page.locator('.property-filter-any:checked').count(), 11);
  assert.ok((await visibleCatalogTitles(page)).length > catalog.oracle.scalaLiveTitles.length);

  const failedCatalogPage = await context.newPage();
  await failedCatalogPage.route('**/data/projects*.json', route => route.abort());
  await failedCatalogPage.goto(`${baseUrl}/projects/tech?tech=scala`);
  await failedCatalogPage.waitForFunction(() => document.querySelector('#catalog-results')?.dataset.catalogEnhanced === 'failed');
  assert.deepEqual(await failedCatalogPage.locator('.project-results .project-summary-title').allTextContents(), expectedProjectTitles);
  assert.equal(await failedCatalogPage.locator('#catalog-count').textContent(), '72 projects — interactive filtering unavailable.');
  await failedCatalogPage.close();

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

  await page.goto(`${baseUrl}/project/gatehouse/help`);
  await assert.doesNotReject(page.getByRole('heading', { name: 'Help or Join' }).waitFor());
  assert.equal(await page.locator('.detail-row a[href="/project/gatehouse"]').count(), 1);
  assert.equal(await page.getByRole('link', { name: 'sponsor' }).count(), 1);
  await assertNoBlockingA11y(page, 'Help page');

  await page.goto(`${baseUrl}/project/gatehouse/sponsor`);
  await assert.doesNotReject(page.getByRole('heading', { name: 'Sponsor' }).first().waitFor());
  assert.equal(await page.locator('#sponsor-methods .paypal-form').count(), 1);
  assert.equal(await page.locator('#sponsor-methods input[name="cmd"]').inputValue(), '_donations');
  assert.equal(await page.locator('#sponsor-methods input[name="business"]').inputValue(), 'HZCUYKJFR3EQ');
  assert.equal(await page.getByRole('heading', { name: 'Send a message' }).count(), 1);
  assert.equal(await page.getByRole('link', { name: 'help/join' }).count(), 1);
  await assertNoBlockingA11y(page, 'Sponsor page');

  const supportNoScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const supportNoScriptPage = await supportNoScriptContext.newPage();
  await supportNoScriptPage.goto(`${baseUrl}/project/gatehouse/help`);
  assert.equal(await supportNoScriptPage.getByRole('heading', { name: 'Help or Join' }).count(), 1);
  await supportNoScriptPage.goto(`${baseUrl}/project/gatehouse/sponsor`);
  assert.equal(await supportNoScriptPage.locator('#sponsor-methods .paypal-form').count(), 1);
  await supportNoScriptContext.close();

  const missing = await page.goto(`${baseUrl}/project/DOES-NOT-EXIST`);
  assert.equal(missing.status(), 404);
  await assert.doesNotReject(page.getByRole('heading', { name: 'Page not found' }).waitFor());

  console.log('Static-site browser proof verified.');
} finally {
  if (browser) await browser.close();
  run('docker', [...composeArgs, 'down']);
}
