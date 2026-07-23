import {
  activePropertyFilters,
  addFacetFormContext,
  hasCatalogQuery,
  headingForContext,
  parseCatalogContext,
  propertyFormContext,
  relatedSections,
  selectedFacets,
  selectProjects,
} from '{{ .CatalogCore.RelPermalink }}';

function hiddenInput(name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  return input;
}

function replaceHiddenFields(container, fields) {
  if (!container) return;
  container.replaceChildren(...fields.map(([name, value]) => hiddenInput(name, value)));
}

function filterFields(filters) {
  return filters.map(filter => [`filter.${filter.name}`, filter.value]);
}

function selectedFacetLink(facet) {
  const link = document.createElement('a');
  link.className = 'chip selected-facet';
  link.href = facet.href;
  link.setAttribute('aria-label', facet.removeLabel);
  const label = document.createElement('span');
  label.textContent = facet.label;
  const remove = document.createElement('span');
  remove.className = 'selected-facet-remove';
  remove.setAttribute('aria-hidden', 'true');
  remove.textContent = '×';
  link.append(label, remove);
  return link;
}

function updateResultsHeading(context, filters) {
  const heading = document.getElementById('catalog-results-heading');
  const facets = selectedFacets(context, filters);
  if (facets.length === 0) {
    heading.textContent = headingForContext(context);
    return;
  }

  const label = document.createElement('span');
  label.className = 'results-heading-label';
  if (context.kind === 'tags') label.textContent = 'Projects with tags:';
  if (context.kind === 'technologies') label.textContent = 'Projects with technologies:';
  if (context.kind === 'facets') label.textContent = 'Projects with tags and technologies:';
  if (context.kind === 'characteristic') label.textContent = 'Projects with characteristic:';
  const facetGroup = document.createElement('span');
  facetGroup.className = 'selected-facets';
  facetGroup.append(...facets.map(selectedFacetLink));
  heading.replaceChildren(label, facetGroup);
}

function relatedForm(kind, term, context, filters) {
  const form = document.createElement('form');
  form.method = 'get';
  const formContext = addFacetFormContext(context, kind, term);
  form.action = formContext.action;
  const fields = [...formContext.fields, ...filterFields(filters)];
  fields.forEach(([name, value]) => form.append(hiddenInput(name, value)));
  const button = document.createElement('button');
  button.className = 'chip';
  button.type = 'submit';
  button.textContent = term;
  form.append(button);
  return form;
}

function relatedSection(related, context, filters) {
  const section = document.createElement('section');
  section.className = 'surface related-section';
  const heading = document.createElement('h2');
  heading.textContent = related.kind === 'tags' ? 'Tags' : 'Technologies';
  section.append(heading);
  const list = document.createElement('ul');
  list.className = 'chip-list';
  related.terms.forEach(term => {
    const item = document.createElement('li');
    item.append(relatedForm(related.kind, term, context, filters));
    list.append(item);
  });
  section.append(list);
  return section;
}

function updateRelatedControls(projects, context, filters) {
  const sections = relatedSections(projects, context).filter(section => section.terms.length);
  const container = document.getElementById('catalog-related');
  const discovery = document.getElementById('catalog-discovery');
  if (context.kind === 'all') {
    if (container) container.replaceChildren();
    if (discovery) discovery.hidden = false;
    const section = document.getElementById('catalog-related-tags');
    const list = document.getElementById('catalog-related-tags-list');
    if (!section || !list) return;
    const related = sections[0];
    if (!related) {
      section.remove();
      return;
    }
    list.replaceChildren(...related.terms.map(term => {
      const item = document.createElement('li');
      item.append(relatedForm('tags', term, context, filters));
      return item;
    }));
    return;
  }
  if (discovery) discovery.hidden = true;
  if (container) {
    container.replaceChildren(...sections.map(section => relatedSection(section, context, filters)));
  }
}

function updatePropertyForm(context, query, controls) {
  const form = document.getElementById('catalog-filter-form');
  if (!form) return;
  const formContext = propertyFormContext(context);
  form.action = formContext.action;
  replaceHiddenFields(document.getElementById('catalog-filter-context'), formContext.fields);

  controls.properties.forEach(property => {
    const requestedValue = query.get(`filter.${property.name}`);
    const inputs = form.querySelectorAll(`[name="filter.${property.name}"]`);
    inputs.forEach(input => {
      input.checked = requestedValue === null ? input.value === '' : input.value === requestedValue;
    });
  });
}

function updateSearchForm(context, filters) {
  const search = document.getElementById('catalog-search');
  if (search && context.kind === 'search' && context.searchTerm.trim()) search.value = context.searchTerm;
  replaceHiddenFields(document.getElementById('catalog-search-context'), filterFields(filters));
}

function updateResults(projects, context, pathname, query, controls, filters) {
  const selectedLinks = new Set(projects.map(project => project.link));
  const rows = document.querySelectorAll('#catalog-results .project-result');
  rows.forEach(row => {
    if (!selectedLinks.has(row.dataset.projectLink)) row.remove();
  });

  const results = document.getElementById('catalog-results');
  const empty = document.getElementById('catalog-empty-results');
  results.hidden = projects.length === 0;
  empty.hidden = projects.length !== 0;
  updateResultsHeading(context, filters);
  document.getElementById('catalog-count').textContent = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;

  if (hasCatalogQuery(pathname, query, controls)) {
    document.getElementById('catalog-results-heading').focus();
  }
}

async function enhanceCatalog() {
  const results = document.getElementById('catalog-results');
  const count = document.getElementById('catalog-count');
  if (!results || !count) return;

  const query = new URLSearchParams(window.location.search);
  try {
    const response = await fetch(results.dataset.catalog);
    if (!response.ok) throw new Error(`Catalog request returned ${response.status}`);
    const catalog = await response.json();
    const context = parseCatalogContext(window.location.pathname, query, catalog.controls);
    const projects = selectProjects(catalog.projects, context, query, catalog.controls);
    const filters = activePropertyFilters(query, catalog.controls);

    updateSearchForm(context, filters);
    updatePropertyForm(context, query, catalog.controls);
    updateResults(projects, context, window.location.pathname, query, catalog.controls, filters);
    updateRelatedControls(projects, context, filters);
    results.dataset.catalogEnhanced = 'true';
  } catch {
    const projectCount = results.querySelectorAll('.project-result').length;
    count.textContent = `${projectCount} projects — interactive filtering unavailable.`;
    results.dataset.catalogEnhanced = 'failed';
  }
}

enhanceCatalog();
