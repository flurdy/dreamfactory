import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  generateStaticData,
  loadCanonicalProjects,
  subtractYearsClamped,
  validateCanonicalData,
  validateCanonicalProjectFilename,
} from '../../scripts/lib/static-projects.mjs';

const asOf = '2026-07-20T12:00:00Z';
const oracle = JSON.parse(fs.readFileSync('test/fixtures/static-site/play-oracle-2026-07-20/projects.json', 'utf8'));
const source = loadCanonicalProjects();
const canonicalProjectFiles = fs.readdirSync('static-site/source/projects').sort();
const approvedCharacteristics = new Map([
  ['baby_crowd_monitor', { development: 'notstarted' }],
  ['bad_usernames', { appeal: 'keen' }],
  ['Bookmarks', { development: 'notstarted' }],
  ['consensus', { appeal: 'maybe' }],
  ['gauge', { appeal: 'keen' }],
  ['Grapemine', { development: 'notstarted' }],
  ['Guvnor', { complexity: 'verydifficult' }],
  ['Problems', { complexity: 'easy' }],
  ['shopmobile', { release: 'mothballed' }],
]);

function byRoute(projects) {
  return new Map(projects.map(project => [project.link ?? project.route, project]));
}

function sorted(values) {
  return [...values].sort();
}

function fixKnownLinks(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('@routes.ProjectController.ideas()', '/projects/?filter.idea=require')
      .replaceAll('https:/github.com', 'https://github.com');
  }
  if (Array.isArray(value)) return value.map(fixKnownLinks);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fixKnownLinks(item)]));
  }
  return value;
}

test('canonical data validates with explicit stable route identity', () => {
  assert.equal(source.projects.length, 74);
  assert.equal(new Set(source.projects.map(project => project.route.toLowerCase())).size, 74);
  assert.equal(source.projects.find(project => project.route === 'Scala Soup').aliases[0], 'Scala-Soup');
  assert.equal(source.projects.find(project => project.route === 'Spring-boot-logging-json').aliases[0], 'spring-boot-logging-json');
  assert.deepEqual(source.projects.find(project => project.route === 'expire').keywords, [
    'Expire', 'shopping', 'pantry', 'fridge', 'food', 'groceries', 'produce', 'bestby',
  ]);
  assert.deepEqual(source.projects.find(project => project.route === 'Lucid').owners, [
    { name: 'Eray by Flurdy', link: 'https://eray.uk' },
  ]);
  assert.doesNotMatch(JSON.stringify(source), /@routes|https:\/github/);
});

test('canonical source stores exactly one project per JSON file', () => {
  const entries = fs.readdirSync('static-site/source/projects', { withFileTypes: true });
  assert.equal(entries.length, 74);
  assert.ok(entries.every(entry => entry.isFile() && validateCanonicalProjectFilename(entry.name)));
  assert.throws(() => validateCanonicalProjectFilename('Bad_Name.json'), /must be kebab-case JSON/);
  assert.throws(() => validateCanonicalProjectFilename('bad-name.txt'), /must be kebab-case JSON/);

  const projects = entries
    .map(entry => entry.name)
    .sort()
    .map(filename => JSON.parse(fs.readFileSync(`static-site/source/projects/${filename}`, 'utf8')));
  assert.ok(projects.every(project => project && typeof project === 'object' && !Array.isArray(project)));
  assert.deepEqual(projects.map(project => project.route), source.projects.map(project => project.route));
});

test('schema and semantic validation reject lossy or ambiguous source data', () => {
  const unknownField = structuredClone(source);
  unknownField.projects[0].unexpected = true;
  assert.throws(
    () => validateCanonicalData(unknownField, canonicalProjectFiles),
    /baby-crowd-monitor\.json.*additional properties/,
  );

  const unsupportedValue = structuredClone(source);
  unsupportedValue.projects[0].characteristics.appeal = 'high';
  assert.throws(() => validateCanonicalData(unsupportedValue), /must be equal to one of the allowed values/);

  const invalidDate = structuredClone(source);
  invalidDate.projects[0].dates.created = '2026-02-30';
  assert.throws(
    () => validateCanonicalData(invalidDate, canonicalProjectFiles),
    /baby-crowd-monitor\.json: Invalid calendar date/,
  );

  const duplicateRoute = structuredClone(source);
  duplicateRoute.projects[1].route = duplicateRoute.projects[0].route;
  assert.throws(
    () => validateCanonicalData(duplicateRoute, canonicalProjectFiles),
    /Duplicate case-insensitive route.*baby-crowd-monitor\.json.*bad-usernames\.json/,
  );

  const caseDuplicateRoute = structuredClone(source);
  caseDuplicateRoute.projects[1].route = caseDuplicateRoute.projects[0].route.toUpperCase();
  assert.throws(() => validateCanonicalData(caseDuplicateRoute), /Duplicate case-insensitive route/);

  const traversalRoute = structuredClone(source);
  traversalRoute.projects[0].route = '../project';
  assert.throws(() => validateCanonicalData(traversalRoute), /must match pattern/);

  const malformedUrl = structuredClone(source);
  malformedUrl.projects.find(project => project.route === 'bad_usernames').urls.live = 'https://%';
  assert.throws(() => validateCanonicalData(malformedUrl), /Invalid bad_usernames URL live/);

  const malformedLicense = structuredClone(source);
  malformedLicense.projects.find(project => project.route === 'Dreamfactory').license.link = 'https://%';
  assert.throws(() => validateCanonicalData(malformedLicense), /Invalid Dreamfactory license/);

  const malformedOwner = structuredClone(source);
  malformedOwner.projects.find(project => project.route === 'Lucid').owners[0].link = 'https://%';
  assert.throws(() => validateCanonicalData(malformedOwner), /Invalid Lucid owner Eray by Flurdy/);
});

test('fixed-time generation is byte-stable and timezone-explicit', () => {
  const first = generateStaticData({ asOf, write: false });
  const second = generateStaticData({ asOf, write: false });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.catalog.asOf, '2026-07-20T12:00:00.000Z');
  assert.equal(first.catalog.timeZone, 'UTC');
  assert.throws(() => generateStaticData({ asOf: '2026-07-20T12:00:00', write: false }), /explicit timezone/);
});

test('catalog controls cover every property and characteristic alias', () => {
  const { catalog } = generateStaticData({ asOf, write: false });
  assert.deepEqual(
    catalog.projects.map(project => project.title.toLowerCase()),
    [...catalog.projects].map(project => project.title.toLowerCase()).sort(),
  );
  assert.deepEqual(catalog.controls.properties.map(property => property.name), [
    'popular', 'dead', 'unlikely', 'recent', 'updated', 'stale', 'live', 'idea', 'code', 'mobile', 'commercial',
  ]);
  const aliases = Object.fromEntries(catalog.controls.characteristics.map(characteristic => [
    characteristic.type,
    Object.fromEntries(characteristic.values.filter(value => value.aliases.length).map(value => [value.name, value.aliases])),
  ]));
  assert.deepEqual(aliases, {
    appeal: { interested: ['good'] },
    complexity: {
      verydifficult: ['veryhigh'],
      difficult: ['high', 'hard'],
      medium: ['average'],
      easy: ['low'],
    },
    likelihood: { possibly: ['maybe'], unlikely: ['low', 'slight'] },
    'status.development': { abandoned: ['cancelled', 'mothballed'] },
    'status.release': {},
    'status.deploy': { live: ['demo', 'online'] },
  });
});

test('calendar year subtraction clamps leap days', () => {
  const leapDay = new Date('2024-02-29T12:34:56.789Z');
  assert.equal(subtractYearsClamped(leapDay, 1).toISOString(), '2023-02-28T12:34:56.789Z');
  assert.equal(subtractYearsClamped(leapDay, 8).toISOString(), '2016-02-29T12:34:56.789Z');
});

test('fixed-time output matches the Play oracle except approved source decisions', () => {
  const { catalog, redirects } = generateStaticData({ asOf, write: false });
  const actualProjects = byRoute(catalog.projects);
  const oracleProjects = byRoute(oracle.projects);
  const supplementalRoutes = sorted([...actualProjects.keys()].filter(route => !oracleProjects.has(route)));
  assert.deepEqual(supplementalRoutes, ['Foyer', 'thoughtbox']);
  assert.deepEqual(sorted([...oracleProjects.keys()].filter(route => !actualProjects.has(route))), []);

  const foyer = actualProjects.get('Foyer');
  assert.equal(foyer.title, 'Foyer');
  assert.equal(foyer.characteristics.development, 'alpha');
  assert.equal(foyer.characteristics.release, 'notreleased');
  assert.equal(foyer.characteristics.deploy, 'offline');

  const thoughtbox = actualProjects.get('thoughtbox');
  assert.equal(thoughtbox.title, 'Thoughtbox');
  assert.equal(thoughtbox.characteristics.development, 'alpha');
  assert.equal(thoughtbox.characteristics.release, 'notreleased');
  assert.equal(thoughtbox.characteristics.deploy, 'offline');

  for (const [route, expected] of oracleProjects) {
    const actual = actualProjects.get(route);
    for (const key of [
      'title', 'encoded', 'link', 'pathSegment', 'description', 'urls', 'urlEntries', 'dates',
      'versions', 'tags', 'technologies', 'license', 'comments', 'derived',
    ]) {
      assert.deepEqual(actual[key], expected[key], `${route} ${key}`);
    }

    const expectedNews = fixKnownLinks(expected.news);
    assert.deepEqual(actual.news, expectedNews, `${route} news`);

    const changes = approvedCharacteristics.get(route) ?? {};
    assert.deepEqual(actual.characteristics, { ...expected.characteristics, ...changes }, `${route} characteristics`);

    assert.deepEqual(actual.summaryUrl, expected.summaryUrl, `${route} homepage summary URL`);
    if (
      expected.characteristics.development === 'abandoned' &&
      !(expected.urls.live && expected.characteristics.deploy === 'live') &&
      (expected.urls.project || expected.urls.live)
    ) {
      assert.equal(actual.listSummaryUrl.kind, 'not-live', `${route} abandoned list summary URL`);
      assert.equal(actual.listSummaryUrl.href, expected.urls.live ?? expected.urls.project, `${route} abandoned list summary href`);
    } else {
      assert.deepEqual(actual.listSummaryUrl, expected.summaryUrl, `${route} list summary URL`);
    }

    assert.ok(actual.aliases.includes(expected.link), `${route} canonical alias`);
    assert.ok(actual.aliases.includes(expected.title), `${route} title alias`);
  }

  assert.deepEqual(catalog.home.newLinks, ['thoughtbox', 'Foyer', ...oracle.home.newLinks.slice(0, 8)]);
  assert.deepEqual(new Set(catalog.home.updatedLinks), new Set([
    ...oracle.home.updatedLinks.filter(link => link !== 'who_to'),
    'Foyer',
  ]));
  assert.deepEqual(catalog.home.popularLinks, oracle.home.popularLinks);
  assert.equal(catalog.browse.tags.length, 50);
  assert.deepEqual(catalog.browse.tags.slice(0, 5), ['mobile', 'api', 'productivity', 'commercial', 'email']);
  assert.ok(catalog.browse.tags.every(tag => !['idea', 'live', 'popular'].includes(tag)));
  assert.equal(catalog.browse.technologies.length, 30);
  assert.deepEqual(catalog.browse.technologies.slice(0, 5), ['scala', 'play', 'docker', 'typescript', 'go']);
  assert.deepEqual(catalog.home.latestNews, [
    { date: '2026-Aug-10', project: 'Thoughtbox', description: 'Completed Trello-backed CLI MVP' },
    { date: '2026-Aug-07', project: 'Thoughtbox', description: 'Started Thoughtbox' },
    { date: '2026-Aug-03', project: 'Foyer', description: 'Started Foyer' },
    ...oracle.home.latestNews.slice(0, 23),
  ]);
  assert.deepEqual(sorted(catalog.home.randomExcludedLinks), sorted([
    ...oracle.home.randomExcludedLinks.filter(link => !['who_to', 'Handshake'].includes(link)),
    'Foyer',
    'thoughtbox',
  ]));
  assert.deepEqual(
    catalog.home.noJavaScriptRandomProjects.map(project => project.link),
    [
      ...oracle.home.noJavaScriptRandomProjects.slice(0, 4).map(project => project.link),
      'Handshake',
      ...oracle.home.noJavaScriptRandomProjects.slice(4).map(project => project.link).filter(link => link !== 'Valuta'),
    ],
  );
  assert.deepEqual(catalog.oracle.searchDreamfactoryLiveTitles, oracle.oracle.searchDreamfactoryLiveTitles);
  assert.deepEqual(catalog.oracle.scalaLiveTitles, oracle.oracle.scalaLiveTitles);
  assert.deepEqual(
    catalog.oracle.easyComplexityTitles,
    [...oracle.oracle.easyComplexityTitles, 'Problems'].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase())),
  );

  const oldRedirects = fs.readFileSync('test/fixtures/static-site/play-oracle-redirects-2026-07-20.txt', 'utf8')
    .split('\n').filter(Boolean);
  const newRedirects = new Set(redirects.split('\n').filter(Boolean));
  oldRedirects.forEach(redirect => assert.ok(newRedirects.has(redirect), `missing redirect: ${redirect}`));
  assert.ok(newRedirects.has('/project/Scala-Soup /project/Scala%20Soup 301'));
});
