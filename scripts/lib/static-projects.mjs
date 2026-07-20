import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(rootDirectory, 'static-site/source/projects.json');
const schemaPath = path.join(rootDirectory, 'static-site/schema/projects.schema.json');
const generatedDataPath = path.join(rootDirectory, 'static-site/data/projects.json');
const browserDataPath = path.join(rootDirectory, 'static-site/static/data/projects.json');
const redirectsPath = path.join(rootDirectory, 'static-site/static/_redirects');
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export function loadCanonicalProjects() {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  validateCanonicalData(source);
  return source;
}

export function validateCanonicalData(source) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  if (!validate(source)) {
    const errors = validate.errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('\n');
    throw new Error(`Canonical project data failed schema validation:\n${errors}`);
  }
  validateProjectIdentity(source.projects);
  source.projects.forEach(project => {
    validateProjectDates(project);
    validateProjectUrls(project);
  });
  return source;
}

export function generateStaticData({ asOf = new Date().toISOString(), write = true } = {}) {
  const buildTime = parseBuildTime(asOf);
  const source = loadCanonicalProjects();
  const projects = source.projects.map(project => renderProject(project, buildTime)).sort(compareRoute);
  const home = buildHomeData(projects);
  const catalog = {
    schemaVersion: source.schemaVersion,
    asOf: buildTime.toISOString(),
    timeZone: 'UTC',
    projectCount: projects.length,
    home,
    oracle: buildOracle(projects),
    projects,
  };
  const redirects = buildRedirects(source.projects);

  if (write) {
    writeJson(generatedDataPath, catalog);
    writeJson(browserDataPath, catalog);
    fs.mkdirSync(path.dirname(redirectsPath), { recursive: true });
    fs.writeFileSync(redirectsPath, redirects);
  }

  return { catalog, redirects };
}

function validateProjectIdentity(projects) {
  const routes = new Map();
  const aliases = new Map();
  for (const project of projects) {
    const normalizedRoute = project.route.toLowerCase();
    if (routes.has(normalizedRoute)) {
      throw new Error(`Duplicate case-insensitive route ${project.route}`);
    }
    routes.set(normalizedRoute, project.route);
    for (const alias of identityAliases(project)) {
      addIdentity(aliases, alias, project.route, 'alias');
    }
  }
  for (const [identity, route] of aliases) {
    const routeOwner = routes.get(identity);
    if (routeOwner && routeOwner !== route) {
      throw new Error(`Alias ${identity} for ${route} conflicts with route ${routeOwner}`);
    }
  }
}

function addIdentity(identities, value, route, kind) {
  const normalized = value.toLowerCase();
  const existing = identities.get(normalized);
  if (existing && existing !== route) {
    throw new Error(`Duplicate case-insensitive ${kind} ${value} for ${existing} and ${route}`);
  }
  identities.set(normalized, route);
}

function identityAliases(project) {
  return [...new Set([project.title, project.title.toLowerCase(), project.route.toLowerCase(), project.encoded, ...(project.aliases ?? [])].filter(Boolean))];
}

function validateProjectDates(project) {
  Object.values(project.dates).forEach(parseCalendarDate);
  project.news.forEach(item => parseCalendarDate(item.date));
  project.comments.forEach(item => parseCalendarDate(item.date));
}

function validateProjectUrls(project) {
  Object.entries(project.urls).forEach(([key, value]) => validateHttpUrl(value, `${project.route} URL ${key}`));
  if (project.license) validateHttpUrl(project.license.link, `${project.route} license`);
  project.owners?.forEach(owner => validateHttpUrl(owner.link, `${project.route} owner ${owner.name}`));
  if (!project.urlOrder) return;
  const ordered = new Set(project.urlOrder);
  const missing = Object.keys(project.urls).filter(key => !ordered.has(key));
  const unknown = project.urlOrder.filter(key => !project.urls[key]);
  if (missing.length || unknown.length) {
    throw new Error(`URL order for ${project.route} does not match its URL keys`);
  }
}

function validateHttpUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function parseBuildTime(value) {
  if (!/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(value)) {
    throw new Error(`Build timestamp must include an explicit timezone: ${value}`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid build timestamp: ${value}`);
  return date;
}

export function parseCalendarDate(value) {
  const [year, month = '01', day = '01'] = value.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return date;
}

export function subtractYearsClamped(date, years) {
  const year = date.getUTCFullYear() - years;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(
    year,
    month,
    day,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

function renderProject(project, buildTime) {
  const threeYearsAgo = subtractYearsClamped(buildTime, 3);
  const eightYearsAgo = subtractYearsClamped(buildTime, 8);
  const dateValues = Object.values(project.dates).map(parseCalendarDate);
  const newsDates = project.news.map(item => parseCalendarDate(item.date));
  const isDateRecent = date => threeYearsAgo < date;
  const isDateStale = date => eightYearsAgo > date;
  const isRecentlyCreated = project.dates.created ? isDateRecent(parseCalendarDate(project.dates.created)) : false;
  const isRecentlyUpdated = dateValues.some(isDateRecent) || newsDates.some(isDateRecent);
  const isIdea = project.tags.includes('idea');
  const development = project.characteristics.development;
  const release = project.characteristics.release;
  const isNotStartedOrAbandoned = !development || development === 'notstarted' || development === 'abandoned';
  const isNotReleasedOrMothballed = !release || release === 'notreleased' || release === 'mothballed';
  const dead = isNotReleasedOrMothballed && isNotStartedOrAbandoned && !isIdea && !isRecentlyUpdated && !isRecentlyCreated;
  const stale = (dateValues.length === 0 || dateValues.some(isDateStale)) &&
    newsDates.every(isDateStale) &&
    isNotReleasedOrMothballed &&
    isNotStartedOrAbandoned;
  const derived = {
    live: Boolean(project.urls.live) && project.characteristics.deploy === 'live',
    idea: isIdea,
    popular: project.tags.includes('popular'),
    code: Boolean(project.urls.project),
    mobile: project.tags.includes('mobile'),
    commercial: project.tags.includes('commercial'),
    dead,
    stale: stale && !dead,
    updated: isRecentlyUpdated && !isRecentlyCreated,
    recent: isRecentlyCreated,
    unlikely: ['unlikely', 'never'].includes(project.characteristics.likelihood) || ['low', 'none'].includes(project.characteristics.appeal),
  };

  return {
    title: project.title,
    encoded: project.encoded ?? null,
    link: project.route,
    pathSegment: encodePathSegment(project.route),
    aliases: [...new Set([project.route, project.title, ...(project.aliases ?? [])])],
    description: project.description ?? null,
    urls: project.urls,
    urlEntries: urlEntries(project),
    summaryUrl: homepageSummaryUrl(project, derived),
    listSummaryUrl: listSummaryUrl(project, derived),
    dates: { created: project.dates.created ?? null, updated: project.dates.updated ?? null },
    versions: { dev: project.versions.dev ?? null, live: project.versions.live ?? null },
    tags: [...project.tags].sort(compareText),
    technologies: [...project.technologies].sort(compareText),
    license: project.license ?? null,
    ...(project.owners ? { owners: project.owners } : {}),
    ...(project.keywords ? { keywords: project.keywords } : {}),
    characteristics: {
      appeal: project.characteristics.appeal ?? null,
      complexity: project.characteristics.complexity ?? null,
      likelihood: project.characteristics.likelihood ?? null,
      development: development ?? null,
      release: release ?? null,
      deploy: project.characteristics.deploy ?? null,
    },
    news: [...project.news]
      .sort((left, right) => compareDated(right, left))
      .map(item => ({ date: `${item.date}T00:00:00.000Z`, description: item.description })),
    comments: [...project.comments]
      .sort((left, right) => compareDated(right, left))
      .map(item => ({ date: `${item.date}T00:00:00.000Z`, comment: item.comment })),
    derived,
  };
}

function urlEntries(project) {
  const keys = project.urlOrder ?? [...new Set(['project', 'live', ...Object.keys(project.urls).sort(compareText)])];
  return keys.filter(key => project.urls[key]).map(key => ({ key, url: project.urls[key] }));
}

function homepageSummaryUrl(project, derived) {
  if (project.urls.live && derived.live) return summaryUrl('live', project.urls.live);
  if (project.urls.project) return summaryUrl('project', project.urls.project);
  if (project.urls.live) return summaryUrl('not-live', project.urls.live);
  return summaryUrl('empty');
}

function listSummaryUrl(project, derived) {
  if (project.urls.live && derived.live) return summaryUrl('live', project.urls.live);
  if (project.urls.project && project.characteristics.development !== 'abandoned') {
    return summaryUrl('project', project.urls.project);
  }
  if (project.urls.live) return summaryUrl('not-live', project.urls.live);
  if (project.urls.project) return summaryUrl('not-live', project.urls.project);
  return summaryUrl('empty');
}

function summaryUrl(kind, href) {
  return { kind, href: href ?? null, text: href ? curtailUrl(href, 25) : '' };
}

function curtailUrl(value, maxLength) {
  const url = new URL(value);
  const pathname = url.pathname === '/' ? '' : url.pathname;
  const naked = `${url.hostname}${pathname}${url.search.slice(1)}`;
  return naked.length > maxLength ? `..${naked.slice(-maxLength)}` : naked;
}

function buildHomeData(projects) {
  const newestProjects = projects
    .filter(project => project.dates.created)
    .sort((left, right) => compareProjectDate(right.dates.created, left.dates.created) || compareRoute(left, right))
    .slice(0, 10);
  const updatedCandidates = projects
    .filter(project => project.dates.created || project.dates.updated)
    .sort((left, right) => newestProjectDate(right) - newestProjectDate(left) || compareRoute(left, right));
  const excludedNewRoutes = new Set(newestProjects
    .filter(project => project.derived.idea || !project.characteristics.development || project.characteristics.development === 'notstarted')
    .map(project => project.link));
  const updatedProjects = updatedCandidates.filter(project => !excludedNewRoutes.has(project.link)).slice(0, 7);
  const popularProjects = projects.filter(project => project.derived.popular).sort(compareRoute).slice(0, 7);
  const randomExcludedLinks = [...new Set([...newestProjects, ...updatedProjects, ...popularProjects].map(project => project.link))].sort(compareText);
  const randomCandidates = projects.filter(project => !randomExcludedLinks.includes(project.link));
  const healthy = randomCandidates.filter(project => !project.derived.dead && !project.derived.unlikely && !project.derived.stale).sort(compareRoute).slice(0, 7);
  const healthyRoutes = new Set(healthy.map(project => project.link));
  const remaining = randomCandidates.filter(project => !healthyRoutes.has(project.link)).sort(compareRoute).slice(0, 10 - healthy.length);

  return {
    newLinks: newestProjects.map(project => project.link),
    updatedLinks: updatedProjects.map(project => project.link),
    popularLinks: popularProjects.map(project => project.link),
    newProjects: newestProjects,
    updatedProjects,
    popularProjects,
    tags: rankedTerms(projects.flatMap(project => project.tags).filter(tag => !['idea', 'live', 'popular'].includes(tag)), 30),
    technologies: rankedTerms(projects.flatMap(project => project.technologies), 30),
    latestNews: projects
      .flatMap(project => project.news.map(item => ({ ...item, project: project.title, route: project.link })))
      .sort((left, right) => compareDated(right, left) || compareText(left.project, right.project))
      .slice(0, 26)
      .map(item => ({ date: formatNewsDate(item.date), project: item.project, description: item.description })),
    randomExcludedLinks,
    noJavaScriptRandomProjects: [...healthy, ...remaining],
  };
}

function rankedTerms(terms, size) {
  const counts = new Map();
  terms.forEach(term => counts.set(term, (counts.get(term) ?? 0) + 1));
  return [...counts]
    .sort(([leftName, leftCount], [rightName, rightCount]) => rightCount - leftCount || compareText(leftName, rightName))
    .slice(0, size)
    .map(([name]) => name);
}

function buildOracle(projects) {
  const titles = selected => selected.sort((left, right) => compareText(left.title.toLowerCase(), right.title.toLowerCase())).map(project => project.title);
  return {
    searchDreamfactoryLiveTitles: titles(projects.filter(project =>
      project.derived.live && (`${project.title}\n${project.description ?? ''}`).toLowerCase().includes('dreamfactory')
    )),
    scalaLiveTitles: titles(projects.filter(project => project.derived.live && project.technologies.includes('scala'))),
    easyComplexityTitles: titles(projects.filter(project => project.characteristics.complexity === 'easy')),
  };
}

function buildRedirects(projects) {
  const redirects = projects.flatMap(project => {
    const canonical = projectPath(project.route);
    return identityAliases(project)
      .map(projectPath)
      .filter(alias => alias !== canonical)
      .flatMap(alias => [
        `${alias} ${canonical} 301`,
        `${alias}/help ${canonical}/help 301`,
        `${alias}/sponsor ${canonical}/sponsor 301`,
      ]);
  });
  return `${[...new Set(redirects)].sort(compareText).join('\n')}\n`;
}

function projectPath(route) {
  return `/project/${encodePathSegment(route)}`;
}

function encodePathSegment(value) {
  return encodeURIComponent(value);
}

function newestProjectDate(project) {
  return Math.max(...Object.values(project.dates).filter(Boolean).map(value => parseCalendarDate(value).getTime()));
}

function compareProjectDate(left, right) {
  return parseCalendarDate(left) - parseCalendarDate(right);
}

function compareDated(left, right) {
  return parseCalendarDate(left.date.slice(0, 10)) - parseCalendarDate(right.date.slice(0, 10));
}

function formatNewsDate(value) {
  const date = parseCalendarDate(value.slice(0, 10));
  return `${date.getUTCFullYear()}-${monthNames[date.getUTCMonth()]}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function compareRoute(left, right) {
  return compareText(left.link ?? left.route, right.link ?? right.route);
}

function compareText(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function writeJson(outputPath, value) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}
