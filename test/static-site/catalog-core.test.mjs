import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { generateStaticData } from '../../scripts/lib/static-projects.mjs';
import {
  activePropertyFilters,
  headingForContext,
  parseCatalogContext,
  propertyFormContext,
  relatedSections,
  selectedFacets,
  selectProjects,
} from '../../static-site/static/assets/javascript/catalog-core.js';

const asOf = '2026-07-20T12:00:00Z';
const { catalog } = generateStaticData({ asOf, write: false });
const oracle = JSON.parse(fs.readFileSync('test/fixtures/static-site/play-catalog-oracle-2026-07-20.json', 'utf8'));

function renderedTitle(title) {
  return title.replaceAll('&nbsp;', '\u00a0').replaceAll('&amp;', '&');
}

function catalogContext(path) {
  const url = new URL(path, 'https://code.flurdy.com');
  return {
    context: parseCatalogContext(url.pathname, url.searchParams, catalog.controls),
    filters: activePropertyFilters(url.searchParams, catalog.controls),
  };
}

function evaluate(path) {
  const url = new URL(path, 'https://code.flurdy.com');
  const context = parseCatalogContext(url.pathname, url.searchParams, catalog.controls);
  const projects = selectProjects(catalog.projects, context, url.searchParams, catalog.controls);
  const filters = activePropertyFilters(url.searchParams, catalog.controls);
  const selected = catalog.controls.properties.flatMap(property => {
    const value = url.searchParams.get(`filter.${property.name}`);
    const selectedValue = value === null ? '' : value;
    return ['', 'require', 'exclude'].includes(selectedValue)
      ? [[`filter.${property.name}`, selectedValue]]
      : [];
  });
  return {
    heading: headingForContext(context),
    count: `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`,
    titles: projects.map(project => renderedTitle(project.title)),
    related: relatedSections(projects, context)
      .filter(section => section.terms.length)
      .map(section => ({ heading: section.kind === 'tags' ? 'Tags' : 'Technologies', terms: section.terms })),
    propertyForm: {
      action: propertyFormContext(context).action,
      context: propertyFormContext(context).fields,
      selected,
    },
    searchContext: filters.map(filter => [`filter.${filter.name}`, filter.value]),
  };
}

test('catalog query engine matches the rendered Play contract matrix', () => {
  assert.equal(oracle.cases.length, 47);
  oracle.cases.forEach(({ name, path, ...expected }) => {
    assert.deepEqual(evaluate(path), expected, name);
  });
});

test('Play contract matrix covers require and exclude for every property', () => {
  const caseNames = new Set(oracle.cases.map(testCase => testCase.name));
  catalog.controls.properties.forEach(property => {
    assert.ok(caseNames.has(`${property.name}-required`), `${property.name} require case`);
    assert.ok(caseNames.has(`${property.name}-excluded`), `${property.name} exclude case`);
  });
});

test('every characteristic alias resolves to its canonical result set and form action', () => {
  catalog.controls.characteristics.forEach(characteristic => {
    characteristic.values.forEach(value => {
      const canonicalPath = `/projects/characteristic/type/${characteristic.type}/characteristic/${value.name}`;
      const canonical = evaluate(canonicalPath);
      value.aliases.forEach(alias => {
        const aliasResult = evaluate(`/projects/characteristic/type/${characteristic.type}/characteristic/${alias}`);
        assert.deepEqual(aliasResult.titles, canonical.titles, `${characteristic.type} ${alias} titles`);
        assert.equal(aliasResult.heading, canonical.heading, `${characteristic.type} ${alias} heading`);
        assert.equal(aliasResult.propertyForm.action, canonicalPath, `${characteristic.type} ${alias} form action`);
      });
    });
  });
});

test('selected tag and technology facets remove one value while preserving context and property filters', () => {
  const tagContext = catalogContext('/projects/tags?tag=commercial&tags=mobile,api&filter.live=require&filter.stale=exclude');
  assert.deepEqual(selectedFacets(tagContext.context, tagContext.filters), [
    {
      label: 'commercial',
      removeLabel: 'Remove tag commercial',
      href: '/projects/tags?tag=mobile&tags=api&filter.stale=exclude&filter.live=require',
    },
    {
      label: 'mobile',
      removeLabel: 'Remove tag mobile',
      href: '/projects/tags?tag=commercial&tags=api&filter.stale=exclude&filter.live=require',
    },
    {
      label: 'api',
      removeLabel: 'Remove tag api',
      href: '/projects/tags?tag=commercial&tags=mobile&filter.stale=exclude&filter.live=require',
    },
  ]);

  const technologyContext = catalogContext('/projects/technologies?tech=scala&technologies=play&filter.code=require');
  assert.deepEqual(selectedFacets(technologyContext.context, technologyContext.filters), [
    {
      label: 'scala',
      removeLabel: 'Remove technology scala',
      href: '/projects/tech?tech=play&filter.code=require',
    },
    {
      label: 'play',
      removeLabel: 'Remove technology play',
      href: '/projects/tech?tech=scala&filter.code=require',
    },
  ]);
});

test('selected characteristic facet returns to all projects while preserving property filters', () => {
  const { context, filters } = catalogContext(
    '/projects/characteristic/type/complexity/characteristic/low?filter.code=require'
  );
  assert.deepEqual(selectedFacets(context, filters), [{
    label: 'Complexity: Easy',
    removeLabel: 'Remove characteristic Complexity: Easy',
    href: '/projects/?filter.code=require',
  }]);
  assert.deepEqual(selectedFacets(catalogContext('/projects/').context, []), []);
});

test('invalid plural and characteristic contexts do not leak the full catalog', () => {
  assert.deepEqual(evaluate('/projects/tags?tag=mobile').titles, []);
  assert.deepEqual(evaluate('/projects/technologies?tech=scala').titles, []);
  assert.deepEqual(evaluate('/projects/characteristic/type/unknown/characteristic/live').titles, []);
});
