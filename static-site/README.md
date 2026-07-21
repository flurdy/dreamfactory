# Static site

This directory contains the Hugo/Cloudflare Pages migration. Canonical authored project data lives in `source/projects.json`; Hugo data, the browser catalog, and redirects are generated from it.

## Local verification

```bash
scripts/verify-static-site.sh
```

The command requires Node 20 and Hugo `0.164.0`. It validates canonical data, generates timestamp-derived state, then builds Hugo into `static-site/public/` without Scala or SBT.

Run the committed browser proof (build, Docker Compose/nginx, the complete Play catalog contract, no-JavaScript fallback, keyboard focus, accessibility, and 404):

```bash
nvm use
npm install --ignore-scripts
npm run test:static-browser
# Set PLAYWRIGHT_CHROME_PATH if Chrome is not /usr/bin/google-chrome.
```

Run the production-shaped local static server manually after a build:

```bash
docker compose -f static-site/docker-compose.yml up --detach
# browse http://localhost:4176/
# Restart the container after rebuilding because the build replaces public/.
docker compose -f static-site/docker-compose.yml restart static-site
docker compose -f static-site/docker-compose.yml down
```

With Play running on port 9000 and the static server on port 4176, compare full-page screenshots at fixed desktop and mobile widths using Playwright and ImageMagick. The list comparison covers the unfiltered list plus representative search, plural-technology, and characteristic-alias results:

```bash
nvm use
npm run test:list-visual-parity # Complete projects list.
npm run test:visual-parity      # Three representative project details.
```

Each desktop and mobile comparison must differ by no more than 1% of pixels.

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

When credentials and a non-production Pages project are available, configure the repository root as the build root with:

- **Build command:** `npm ci && scripts/build-static-site.sh`
- **Build output directory:** `static-site/public`
- **Environment variables:** `HUGO_VERSION=0.164.0`, `NODE_VERSION=20`
- **Functions:** none

Use a preview deployment only. Do not attach the production custom domain or alter the Kubernetes/Play deployment during this proof.

The Hugo-only route boundary generates canonical characteristic paths and every declared lowercase Play alias. It does not reproduce arbitrary path casing or Play's 400 response for manually malformed tag/technology URLs; doing so would require a Pages Function or Worker. All generated site forms use supported canonical routes.
