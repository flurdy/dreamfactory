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
  ['pilltrack', { development: 'alpha' }],
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
  assert.equal(
    new Set(source.projects.map(project => project.route.toLowerCase())).size,
    source.projects.length,
  );
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
  assert.deepEqual(supplementalRoutes, ['Foyer', 'baton', 'thoughtbox', 'wrap']);
  assert.deepEqual(sorted([...oracleProjects.keys()].filter(route => !actualProjects.has(route))), []);

  const foyer = actualProjects.get('Foyer');
  assert.equal(foyer.title, 'Foyer');
  assert.equal(foyer.urls.live, 'https://foyer.flurdy.io');
  assert.equal(foyer.characteristics.development, 'alpha');
  assert.equal(foyer.characteristics.release, 'released');
  assert.equal(foyer.characteristics.deploy, 'live');

  const baton = actualProjects.get('baton');
  assert.equal(baton.title, 'Baton');
  assert.deepEqual(baton.urls, {});
  assert.deepEqual(baton.versions, { dev: null, live: null });
  assert.equal(baton.characteristics.development, 'alpha');
  assert.equal(baton.characteristics.release, 'notreleased');
  assert.equal(baton.characteristics.deploy, 'offline');
  assert.deepEqual(baton.technologies, ['bash', 'git', 'ssh', 'yaml']);
  assert.equal(baton.license.name, 'MIT');
  assert.match(baton.description, /source is currently private/);
  assert.equal(baton.derived.live, false);
  assert.equal(baton.derived.code, false);

  const thoughtbox = actualProjects.get('thoughtbox');
  assert.equal(thoughtbox.title, 'Thoughtbox');
  assert.equal(thoughtbox.characteristics.development, 'alpha');
  assert.equal(thoughtbox.characteristics.release, 'notreleased');
  assert.equal(thoughtbox.characteristics.deploy, 'offline');
  assert.equal(thoughtbox.derived.mobile, true);
  assert.equal(thoughtbox.derived.idea, false);
  assert.deepEqual(thoughtbox.technologies, ['expo', 'ios', 'node.js', 'react-native', 'trello', 'typescript']);
  assert.match(thoughtbox.description, /native outbox acceptance remains pending/);
  assert.deepEqual(thoughtbox.comments, [
    { date: '2026-10-30T00:00:00.000Z', comment: 'QR setup and encrypted outbox' },
  ]);
  assert.deepEqual(thoughtbox.news, [
    { date: '2026-08-07T00:00:00.000Z', description: 'Started Thoughtbox' },
  ]);

  const wrap = actualProjects.get('wrap');
  assert.equal(wrap.title, 'Wrap');
  assert.deepEqual(wrap.urls, {});
  assert.equal(wrap.characteristics.development, 'alpha');
  assert.equal(wrap.characteristics.release, 'notreleased');
  assert.equal(wrap.characteristics.deploy, 'offline');
  assert.match(wrap.description, /href="\/project\/Gift%20Registry"/);
  assert.match(wrap.description, /href="\/project\/Wish"/);
  assert.match(wrap.description, /Hosted acceptance and deployment remain pending/);
  assert.deepEqual(wrap.comments, [
    { date: '2026-10-30T00:00:00.000Z', comment: 'Local gift planner implemented' },
  ]);
  assert.deepEqual(wrap.news, [
    { date: '2026-10-06T00:00:00.000Z', description: 'Started Wrap' },
  ]);

  const pilltrackBaseline = oracleProjects.get('pilltrack');
  const usernamesBaseline = oracleProjects.get('bad_usernames');
  const pilltrackUrl = 'https://apps.flurdy.io/pilltrack/';
  const pilltrackSummary = { kind: 'project', href: pilltrackUrl, text: 'apps.flurdy.io/pilltrack/' };
  const approvedUpdates = new Map([
    ['pilltrack', {
      description: 'A local-first iPhone app for recording daily medicines with a clear taken, skipped, missed, or unknown history. Supports optional local reminders, supply and refill tracking, as-needed medicines, and several people in one household on one device. In active development; not yet publicly released.',
      urls: { project: pilltrackUrl },
      urlEntries: [{ key: 'project', url: pilltrackUrl }],
      summaryUrl: pilltrackSummary,
      dates: { ...pilltrackBaseline.dates, updated: '2026-10-30' },
      versions: { dev: '0.1.0', live: null },
      tags: ['health', 'medicine', 'mobile', 'prescription', 'reminders'],
      technologies: ['expo', 'ios', 'react-native', 'typescript'],
      derived: { ...pilltrackBaseline.derived, idea: false, code: true },
      comments: [
        { date: '2026-10-30T00:00:00.000Z', comment: 'Household medicine tracking' },
      ],
    }],
    ['bad_usernames', {
      description: '<p>API service that checks whether a username should be blocked, reserved, or treated as unsafe. English-first, with selected multilingual reserved words. Exact matches block a username; substring matches are advisory.</p><p>Two related projects: the API service is Apache-2.0 licensed, while the separate <a href="https://github.com/flurdy/bad_usernames">bad_usernames JSON dataset</a> has an <a href="https://github.com/flurdy/bad_usernames/blob/master/LICENSE">MIT license</a>. Dataset contributions reach the hosted API when its snapshot is refreshed.</p>',
      urls: { ...usernamesBaseline.urls, dataset: 'https://github.com/flurdy/bad_usernames' },
      urlEntries: [
        ...usernamesBaseline.urlEntries,
        { key: 'dataset', url: 'https://github.com/flurdy/bad_usernames' },
      ],
      dates: { ...usernamesBaseline.dates, updated: '2026-10-30' },
      versions: { dev: '0.1.0-SNAPSHOT', live: '0.1.0-SNAPSHOT' },
      technologies: ['http4s', 'json', 'scala'],
      license: { name: 'Apache 2.0 (API)', link: 'https://www.apache.org/licenses/LICENSE-2.0' },
      news: [
        { date: '2026-10-30T00:00:00.000Z', description: 'API and dataset clarified' },
        ...usernamesBaseline.news,
      ],
    }],
  ]);

  for (const [route, historical] of oracleProjects) {
    const expected = { ...historical, ...approvedUpdates.get(route) };
    const actual = actualProjects.get(route);
    for (const key of [
      'title', 'encoded', 'link', 'pathSegment', 'description', 'urls', 'urlEntries', 'dates',
      'versions', 'tags', 'technologies', 'license', 'comments', 'derived',
    ]) {
      const expectedValue = route === 'Gift Registry' && key === 'description'
        ? `${expected.description}<p>Continued as <a href="/project/wrap">Wrap</a>, focused on planning outgoing gifts, joint presents and gift history.</p>`
        : expected[key];
      assert.deepEqual(actual[key], expectedValue, `${route} ${key}`);
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

  assert.deepEqual(catalog.home.newLinks, ['baton', 'wrap', 'thoughtbox', 'Foyer', ...oracle.home.newLinks.slice(0, 6)]);
  assert.deepEqual(catalog.home.updatedLinks, [
    'bad_usernames', 'baton', 'pilltrack', 'thoughtbox', 'wrap', 'Foyer', 'Lucid',
  ]);
  assert.deepEqual(catalog.home.popularLinks, oracle.home.popularLinks);
  assert.equal(catalog.browse.tags.length, 50);
  assert.deepEqual(catalog.browse.tags.slice(0, 5), ['mobile', 'productivity', 'api', 'commercial', 'email']);
  assert.ok(catalog.browse.tags.every(tag => !['idea', 'live', 'popular'].includes(tag)));
  assert.equal(catalog.browse.technologies.length, 30);
  assert.deepEqual(catalog.browse.technologies.slice(0, 5), ['scala', 'play', 'docker', 'typescript', 'go']);
  assert.deepEqual(catalog.home.latestNews, [
    { date: '2026-Oct-30', project: 'Bad Usernames', description: 'API and dataset clarified' },
    { date: '2026-Oct-30', project: 'Baton', description: 'Added Baton' },
    { date: '2026-Oct-06', project: 'Wrap', description: 'Started Wrap' },
    { date: '2026-Aug-07', project: 'Thoughtbox', description: 'Started Thoughtbox' },
    {
      date: '2026-Aug-06',
      project: 'Foyer',
      description: 'Deployed to <a href="https://foyer.flurdy.io">foyer.flurdy.io</a>',
    },
    { date: '2026-Aug-03', project: 'Foyer', description: 'Started Foyer' },
    ...oracle.home.latestNews.slice(0, 20),
  ]);
  assert.deepEqual(sorted(catalog.home.randomExcludedLinks), sorted([
    ...oracle.home.randomExcludedLinks.filter(link => !['who_to', 'Handshake', 'LavaFlow', 'gatehouse'].includes(link)),
    'Foyer',
    'baton',
    'thoughtbox',
    'wrap',
  ]));
  assert.deepEqual(
    catalog.home.noJavaScriptRandomProjects.map(project => project.link),
    [
      'Cargo', 'Changelog', 'Dreamfactory', 'Hakiki', 'Handshake', 'LavaFlow',
      'Scala Soup', 'baby_crowd_monitor', 'Bookmarks', 'BuyNow',
    ],
  );
  assert.deepEqual(catalog.oracle.searchDreamfactoryLiveTitles, oracle.oracle.searchDreamfactoryLiveTitles);
  assert.deepEqual(catalog.oracle.scalaLiveTitles, ['Bad Usernames', ...oracle.oracle.scalaLiveTitles]);
  assert.deepEqual(
    catalog.oracle.easyComplexityTitles,
    [...oracle.oracle.easyComplexityTitles, 'Problems'].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase())),
  );

  const oldRedirects = fs.readFileSync('test/fixtures/static-site/play-oracle-redirects-2026-07-20.txt', 'utf8')
    .split('\n').filter(Boolean);
  const newRedirects = new Set(redirects.split('\n').filter(Boolean));
  oldRedirects.forEach(redirect => assert.ok(newRedirects.has(redirect), `missing redirect: ${redirect}`));
  assert.ok(newRedirects.has('/project/Scala-Soup /project/Scala%20Soup 301'));
  assert.ok(newRedirects.has('/project/Wrap /project/wrap 301'));
  assert.ok(newRedirects.has('/project/Baton /project/baton 301'));
});
