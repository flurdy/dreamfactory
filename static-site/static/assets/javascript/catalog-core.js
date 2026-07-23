function normalizedPath(pathname) {
  const path = pathname.replace(/\/+$/, '');
  return path || '/';
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function characteristicFor(type, requestedName, controls) {
  const group = controls.characteristics.find(characteristic => characteristic.type === type);
  if (!group) return null;
  const requested = requestedName.toLowerCase();
  const value = group.values.find(candidate =>
    candidate.name.toLowerCase() === requested || candidate.aliases.some(alias => alias.toLowerCase() === requested)
  );
  return value ? { ...value, type: group.type, typeLabel: group.label, field: group.field } : null;
}

export function parseCatalogContext(pathname, query, controls) {
  const path = normalizedPath(pathname);
  if (path === '/projects/search') {
    return { kind: 'search', searchTerm: query.get('searchterm') ?? '' };
  }
  if (path === '/projects/tag') {
    const tag = query.get('tag');
    return tag ? { kind: 'tags', route: 'tag', terms: [tag] } : { kind: 'invalid' };
  }
  if (path === '/projects/tags') {
    const tag = query.get('tag');
    const tags = query.get('tags');
    return tag && tags ? { kind: 'tags', route: 'tags', terms: [tag, ...tags.split(',')] } : { kind: 'invalid' };
  }
  if (path === '/projects/tech') {
    const technology = query.get('tech');
    return technology ? { kind: 'technologies', route: 'tech', terms: [technology] } : { kind: 'invalid' };
  }
  if (path === '/projects/technologies') {
    const technology = query.get('tech');
    const technologies = query.get('technologies');
    return technology && technologies
      ? { kind: 'technologies', route: 'technologies', terms: [technology, ...technologies.split(',')] }
      : { kind: 'invalid' };
  }
  if (path.startsWith('/projects/characteristic/')) {
    const segments = path.split('/');
    const type = decodeSegment(segments[4] ?? '');
    const requestedName = decodeSegment(segments[6] ?? '');
    const characteristic = characteristicFor(type, requestedName, controls);
    return characteristic
      ? { kind: 'characteristic', characteristic }
      : { kind: 'invalid' };
  }
  return { kind: 'all' };
}

export function activePropertyFilters(query, controls) {
  return controls.properties.flatMap(property => {
    const value = query.get(`filter.${property.name}`);
    return value === null ? [] : [{ name: property.name, value }];
  });
}

function matchesContext(project, context) {
  if (context.kind === 'search') {
    if (!context.searchTerm.trim()) return true;
    return project.title.toLowerCase().includes(context.searchTerm)
      || (project.description ?? '').toLowerCase().includes(context.searchTerm);
  }
  if (context.kind === 'tags') {
    if (context.route === 'tag') {
      const tag = context.terms[0].toLowerCase();
      return project.tags.some(projectTag => projectTag.toLowerCase() === tag);
    }
    return context.terms.every(tag => project.tags.includes(tag));
  }
  if (context.kind === 'technologies') {
    if (context.route === 'tech') {
      const technology = context.terms[0].toLowerCase();
      return project.technologies.some(projectTechnology => projectTechnology.toLowerCase() === technology);
    }
    return context.terms.every(technology => project.technologies.includes(technology));
  }
  if (context.kind === 'characteristic') {
    return project.characteristics[context.characteristic.field] === context.characteristic.name;
  }
  return context.kind === 'all';
}

function matchesPropertyFilters(project, query, controls) {
  return controls.properties.every(property => {
    const value = query.get(`filter.${property.name}`);
    if (value === 'require') return project.derived[property.name];
    if (value === 'exclude') return !project.derived[property.name];
    return true;
  });
}

export function selectProjects(projects, context, query, controls) {
  return projects.filter(project => matchesContext(project, context) && matchesPropertyFilters(project, query, controls));
}

export function headingForContext(context) {
  if (context.kind === 'tags') return `Projects with tags: ${context.terms.join(', ')}`;
  if (context.kind === 'technologies') return `Projects with technologies: ${context.terms.join(', ')}`;
  if (context.kind === 'search' && context.searchTerm.trim()) {
    return `Projects containing search term: “${context.searchTerm}”`;
  }
  if (context.kind === 'characteristic') {
    return `Projects with characteristic: ${context.characteristic.typeLabel} — ${context.characteristic.label}`;
  }
  return 'All projects:';
}

function catalogHref(action, fields, filters) {
  const query = new URLSearchParams([
    ...fields,
    ...filters.map(filter => [`filter.${filter.name}`, filter.value]),
  ]);
  const search = query.toString();
  return search ? `${action}?${search}` : action;
}

function contextForTerms(kind, terms) {
  if (terms.length === 0) return { action: '/projects/', fields: [] };
  const tag = kind === 'tags';
  if (terms.length === 1) {
    return { action: tag ? '/projects/tag' : '/projects/tech', fields: [[tag ? 'tag' : 'tech', terms[0]]] };
  }
  return {
    action: tag ? '/projects/tags' : '/projects/technologies',
    fields: [
      [tag ? 'tag' : 'tech', terms[0]],
      [tag ? 'tags' : 'technologies', terms.slice(1).join(',')],
    ],
  };
}

export function selectedFacets(context, filters) {
  if (context.kind === 'tags' || context.kind === 'technologies') {
    const facetType = context.kind === 'tags' ? 'tag' : 'technology';
    return context.terms.map((term, index) => {
      const remainingTerms = context.terms.filter((_, termIndex) => termIndex !== index);
      const remainingContext = contextForTerms(context.kind, remainingTerms);
      return {
        label: term,
        removeLabel: `Remove ${facetType} ${term}`,
        href: catalogHref(remainingContext.action, remainingContext.fields, filters),
      };
    });
  }
  if (context.kind === 'characteristic') {
    const label = `${context.characteristic.typeLabel}: ${context.characteristic.label}`;
    return [{
      label,
      removeLabel: `Remove characteristic ${label}`,
      href: catalogHref('/projects/', [], filters),
    }];
  }
  return [];
}

export function propertyFormContext(context) {
  if (context.kind === 'search' && context.searchTerm.trim()) {
    return { action: '/projects/search', fields: [['searchterm', context.searchTerm]] };
  }
  if (context.kind === 'tags' || context.kind === 'technologies') {
    return contextForTerms(context.kind, context.terms);
  }
  if (context.kind === 'characteristic') {
    const characteristic = context.characteristic;
    return {
      action: `/projects/characteristic/type/${encodeURIComponent(characteristic.type)}/characteristic/${encodeURIComponent(characteristic.name)}`,
      fields: [],
    };
  }
  return { action: '/projects/', fields: [] };
}

function compareText(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function rankedTerms(projects, field, size, ignored = []) {
  const ignoredTerms = new Set(ignored);
  const counts = new Map();
  projects.flatMap(project => project[field]).forEach(term => {
    if (!ignoredTerms.has(term)) counts.set(term, (counts.get(term) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort(([leftName, leftCount], [rightName, rightCount]) => rightCount - leftCount || compareText(leftName, rightName))
    .slice(0, size)
    .map(([name]) => name);
}

export function relatedSections(projects, context) {
  if (context.kind === 'all') {
    return [{ kind: 'tags', terms: rankedTerms(projects, 'tags', 50, ['idea', 'live', 'popular']) }];
  }
  if (context.kind === 'tags') {
    return [{
      kind: 'tags',
      terms: rankedTerms(projects, 'tags', 50, ['idea', 'live', 'popular'])
        .filter(term => !context.terms.includes(term)),
    }];
  }
  if (context.kind === 'technologies') {
    const size = context.terms.length === 1 ? 11 : 30;
    return [{
      kind: 'technologies',
      terms: rankedTerms(projects, 'technologies', size)
        .filter(term => !context.terms.includes(term))
        .slice(0, 10),
    }];
  }
  if (context.kind === 'characteristic') {
    return [
      { kind: 'tags', terms: rankedTerms(projects, 'tags', 50, ['idea', 'live', 'popular']) },
      { kind: 'technologies', terms: rankedTerms(projects, 'technologies', 10) },
    ];
  }
  return [];
}

export function hasCatalogQuery(pathname, query, controls) {
  return normalizedPath(pathname) !== '/projects'
    || activePropertyFilters(query, controls).some(filter => filter.value === 'require' || filter.value === 'exclude');
}
