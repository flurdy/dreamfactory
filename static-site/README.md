# Static site

This directory contains the Hugo/Cloudflare Pages migration. Canonical authored project data lives in `source/projects.json`; Hugo data, the browser catalog, and redirects are generated from it.

## Local verification

```bash
scripts/verify-static-site.sh
```

The command requires Node 20 and Hugo `0.164.0`. It validates canonical data, generates timestamp-derived state, then builds Hugo into `static-site/public/` without Scala or SBT.

Run the committed browser proof (build, Docker Compose/nginx, deterministic random reload, representative filters, keyboard focus, and 404):

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

With Play running on port 9000 and the static server on port 4176, compare full-page screenshots for the three representative project slices at fixed desktop and mobile widths using Playwright and ImageMagick:

```bash
nvm use
npm run test:visual-parity
```

The desktop and mobile comparisons must each differ by no more than 1% of pixels.

Generate the Hugo data, browser catalog, and redirects with:

```bash
nvm use
npm ci
npm run build:static-data
```

Set `DREAMFACTORY_AS_OF` to an ISO timestamp with an explicit timezone for reproducible output. Tests use `2026-07-20T12:00:00Z`. `tools.StaticSiteExport` remains temporarily available only for fixed-clock Play-oracle fixtures; production static builds do not invoke it.

## Cloudflare Pages preview configuration

When credentials and a non-production Pages project are available, configure the repository root as the build root with:

- **Build command:** `npm ci && scripts/build-static-site.sh`
- **Build output directory:** `static-site/public`
- **Environment variables:** `HUGO_VERSION=0.164.0`, `NODE_VERSION=20`
- **Functions:** none

Use a preview deployment only. Do not attach the production custom domain or alter the Kubernetes/Play deployment during this proof.
