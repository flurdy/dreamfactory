# Static site

This directory contains the production Hugo/Cloudflare Pages site. Canonical authored project data lives in `source/projects.json`; the build generates Hugo data, the browser catalog, and redirects. See [`../docs/static-site-operations.md`](../docs/static-site-operations.md) for contributor and deployment operations.

## Local verification

```bash
nvm use
npm ci --ignore-scripts
make static-artifact-verify
make static-verify
```

The commands require Node `22.22.2`, Hugo Extended `0.164.0`, Docker, and Chrome. They validate canonical data, regenerate timestamp-derived state, build Hugo, audit links and routes, run the committed catalog contract, verify no-JavaScript behavior, and perform browser/accessibility checks against a production-shaped nginx container.

The dated fixtures under `../test/fixtures/static-site/` preserve the accepted Play migration baseline. They remain immutable contract evidence; regenerating them requires checking out the former application from Git history.

Run the local server manually after a build:

```bash
make static-preview-up
# http://localhost:4176/
make static-preview-down
```

Generate data, browser catalog, and redirects directly with:

```bash
npm run build:static-data
```

Set `DREAMFACTORY_AS_OF` to an ISO timestamp with an explicit timezone for reproducible output. Tests use `2026-07-20T12:00:00Z`; production derives time-sensitive state at build time.

## Cloudflare Pages

The Git-connected `dreamfactory` Pages project uses:

- Production branch: `master`
- Build command: `npm ci && scripts/build-static-site.sh`
- Build output: `static-site/public`
- Environment: `NODE_VERSION=22.22.2`, `HUGO_VERSION=0.164.0`
- Functions: none
- Custom domain: `code.flurdy.com`

Validate an immutable deployment or branch alias with:

```bash
PAGES_PREVIEW_BASE_URL=https://pages-preview.dreamfactory.pages.dev \
  make pages-preview-verify
```

The Hugo route boundary supports canonical characteristic paths and every declared lowercase legacy alias. It intentionally does not reproduce arbitrary path casing or malformed tag/technology request errors; generated forms only use supported routes.

Rollback is Pages-only: restore a known-good Git revision or select a known-good successful Pages production deployment, then rerun the route, cache, and browser checks. The former Play/Kubernetes origin was retired on 2026-07-24.
