import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAY_BASE_URL || 'http://127.0.0.1:9000';
const outputPath = process.argv[2] || 'test/fixtures/static-site/play-catalog-oracle-2026-07-20.json';
const propertyNames = ['popular', 'dead', 'unlikely', 'recent', 'updated', 'stale', 'live', 'idea', 'code', 'mobile', 'commercial'];
const cases = [
  ...propertyNames.flatMap(name => [
    { name: `${name}-required`, path: `/projects/?filter.${name}=require` },
    { name: `${name}-excluded`, path: `/projects/?filter.${name}=exclude` },
  ]),
  { name: 'healthy-code', path: '/projects/?filter.dead=exclude&filter.stale=exclude&filter.unlikely=exclude&filter.code=require' },
  { name: 'live-code', path: '/projects/?filter.live=require&filter.code=require' },
  { name: 'live-idea-empty', path: '/projects/?filter.live=require&filter.idea=require' },
  { name: 'mobile-commercial', path: '/projects/?filter.mobile=require&filter.commercial=require' },
  { name: 'search', path: '/projects/search?searchterm=dreamfactory' },
  { name: 'search-case-sensitive-edge', path: '/projects/search?searchterm=Dreamfactory' },
  { name: 'search-whitespace', path: '/projects/search?searchterm=%20%20' },
  { name: 'search-live', path: '/projects/search?searchterm=dreamfactory&filter.live=require' },
  { name: 'search-empty', path: '/projects/search?searchterm=no-such-project' },
  { name: 'tag-single', path: '/projects/tag?tag=mobile' },
  { name: 'tag-single-case-insensitive', path: '/projects/tag?tag=Mobile' },
  { name: 'tag-with-filter', path: '/projects/tag?tag=mobile&filter.dead=exclude' },
  { name: 'tags-intersection', path: '/projects/tags?tags=mobile&tag=commercial' },
  { name: 'tags-three-way-empty', path: '/projects/tags?tags=mobile,api&tag=commercial' },
  { name: 'technology-single', path: '/projects/tech?tech=scala' },
  { name: 'technology-single-case-insensitive', path: '/projects/tech?tech=SCALA' },
  { name: 'technology-live', path: '/projects/tech?tech=scala&filter.live=require' },
  { name: 'technologies-intersection', path: '/projects/technologies?technologies=scala&tech=play' },
  { name: 'technologies-mobile', path: '/projects/technologies?technologies=react-native&tech=typescript' },
  { name: 'characteristic', path: '/projects/characteristic/type/complexity/characteristic/easy' },
  { name: 'characteristic-alias', path: '/projects/characteristic/type/complexity/characteristic/low' },
  { name: 'characteristic-filtered', path: '/projects/characteristic/type/complexity/characteristic/easy?filter.live=require' },
  { name: 'appeal-alias', path: '/projects/characteristic/type/appeal/characteristic/good' },
  { name: 'development-alias', path: '/projects/characteristic/type/status.development/characteristic/mothballed' },
  { name: 'deploy-alias', path: '/projects/characteristic/type/status.deploy/characteristic/online' },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const captured = [];
  for (const testCase of cases) {
    const response = await page.goto(`${baseUrl}${testCase.path}`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, `${testCase.path} did not return 200`);
    const contract = await page.evaluate(() => {
      const normalize = value => value.replace(/\s+/g, ' ').trim();
      const form = document.querySelector('.properties-filter-form');
      return {
        heading: normalize(document.querySelector('.results-heading h2').textContent),
        count: normalize(document.querySelector('.results-count').textContent),
        titles: [...document.querySelectorAll('.project-result .project-summary-title')].map(node => node.textContent),
        related: [...document.querySelectorAll('.related-section')].map(section => ({
          heading: normalize(section.querySelector('h2').textContent),
          terms: [...section.querySelectorAll('.chip')].map(node => node.textContent),
        })),
        propertyForm: {
          action: new URL(form.action).pathname,
          context: [...form.querySelectorAll('input[type="hidden"]')].map(input => [input.name, input.value]),
          selected: [...form.querySelectorAll('.property-filter-input:checked')].map(input => [input.name, input.value]),
        },
        searchContext: [...document.querySelectorAll('.search-form input[type="hidden"]')].map(input => [input.name, input.value]),
      };
    });
    captured.push({ ...testCase, ...contract });
  }
  fs.mkdirSync(new URL('../test/fixtures/static-site/', import.meta.url), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ capturedAt: new Date().toISOString(), cases: captured }, null, 2)}\n`);
  console.log(`Captured ${captured.length} Play catalog cases in ${outputPath}.`);
} finally {
  await browser.close();
}
