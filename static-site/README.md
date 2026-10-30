# Static site

The production Hugo/Cloudflare Pages site. Author one JSON file per project under
[`source/projects/`](source/projects/); the build generates Hugo data, the browser
catalog, routes and redirects. Preserve each project's explicit route and aliases.

Run all Makefile commands from the repository root. See:

- [Operations](../docs/static-site-operations.md): setup, verification, preview,
  deployment, monitoring and Pages-only rollback.
- [Catalog compatibility](../docs/static-data-migration-decisions.md): authoring,
  browser/date contracts and immutable historical fixtures.
