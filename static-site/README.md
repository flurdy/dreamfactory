# Static site

This directory contains the Hugo/Cloudflare Pages migration. Canonical authored project data lives in `source/projects.json`; Hugo data, the browser catalog, and redirects are generated from it. See `docs/static-site-operations.md` for contributor, deployment, cutover, rollback, and retirement procedures.

## Local verification

```bash
make static-artifact-verify
```

The command requires Node `22.22.2` and Hugo `0.164.0`. It validates canonical data, generates timestamp-derived state, then builds Hugo into `static-site/public/` without Scala or SBT.

Run the committed browser proof (build, Docker Compose/nginx, the complete Play catalog contract, no-JavaScript fallback, keyboard focus, accessibility, and 404):

```bash
nvm use
npm install --ignore-scripts
make static-verify
# Set PLAYWRIGHT_CHROME_PATH if Chrome is not /usr/bin/google-chrome.
```

`test:static-browser` also crawls the generated route manifest: every canonical HTML/asset route must return 200 and deliberate arbitrary-case/missing project paths must return 404. The manifest rejects duplicate canonical paths, duplicate redirect sources, redirect collisions, and redirect targets that are not generated routes.

Run the production-shaped local static server manually after a build:

```bash
make static-preview-up
# browse http://localhost:4176/
make static-preview-down
```

To reuse the deployment's own manifest against Cloudflare Pages, set its URL. Set `ROUTE_CONTRACT_VERIFY_REDIRECTS=true` only for Pages: local nginx intentionally does not implement the `_redirects` file. The cache check requires HTML revalidation and immutable fingerprinted assets/catalog data.

```bash
PAGES_PREVIEW_BASE_URL=https://pages-preview.dreamfactory.pages.dev \
  make pages-preview-verify
```

With Play running on port 9000 and the static server on port 4176, compare full-page screenshots at fixed desktop and mobile widths using Playwright and ImageMagick. Start Play with `DREAMFACTORY_DETERMINISTIC_HOMEPAGE=true sbt run` for the homepage comparison. The list comparison covers the unfiltered list plus representative search, plural-technology, and characteristic-alias results:

```bash
nvm use
npm run test:list-visual-parity     # Complete projects list.
npm run test:visual-parity          # Representative project detail/support pages.
npm run test:homepage-visual-parity # Homepage with deterministic Play fixture.
```

Each desktop and mobile comparison must differ by no more than 1% of pixels. Homepage parity uses an opt-in Play-only deterministic ordering fixture and blocks Hugo's random-project enhancement so it compares the valid rendered no-JavaScript fallback. `test:static-browser` separately verifies that the enhanced Random box reshuffles on reload.

Generate the Hugo data, browser catalog, and redirects with:

```bash
nvm use
npm ci
npm run build:static-data
```

Set `DREAMFACTORY_AS_OF` to an ISO timestamp with an explicit timezone for reproducible output. Tests use `2026-07-20T12:00:00Z`. `tools.StaticSiteExport` remains temporarily available only for fixed-clock Play-oracle fixtures; production static builds do not invoke it.

The catalog query engine is checked against 47 rendered Play cases, covering every Include/Exclude property, combined filters, searches, singular/plural tag and technology intersections, characteristic aliases, related controls, and form context:

```bash
npm run test:static-catalog
# With Play running locally, deliberately refresh the committed contract fixture:
npm run capture:play-catalog-oracle
```

## Cloudflare Pages preview configuration

The Git-connected `dreamfactory` Pages project uses the repository root with:

- **Production branch:** `master`; canonical production deployments are enabled
- **Preview branch:** `pages-preview`, available at `https://pages-preview.dreamfactory.pages.dev`
- **Build command:** `npm ci && scripts/build-static-site.sh`
- **Build output directory:** `static-site/public`
- **Environment variables:** `HUGO_VERSION=0.164.0`, `NODE_VERSION=22.22.2`
- **Functions:** none
- **Custom domain:** `code.flurdy.com`, active on Pages since 2026-07-22

Use immutable deployment URLs for acceptance evidence. `dreamfactory.pages.dev` and `code.flurdy.com` serve the canonical Hugo deployment; Play remains available only as the rollback origin during observation.

Preview rollback is rehearsed by pushing a new commit whose tree matches the selected prior preview release, then pushing a forward-restore commit. Pages' rollback API only accepts successful production deployments, so it is intentionally not used while production deployments are disabled.

The Hugo-only route boundary generates canonical characteristic paths and every declared lowercase Play alias. It does not reproduce arbitrary path casing or Play's 400 response for manually malformed tag/technology URLs; doing so would require a Pages Function or Worker. All generated site forms use supported canonical routes.
