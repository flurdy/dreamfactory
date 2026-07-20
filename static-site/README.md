# Static-site proof

This directory is the bounded Hugo/Cloudflare Pages proof for `dreamfactory-lu1`, not a production migration.

## Local verification

```bash
scripts/verify-static-site.sh
```

The command requires Hugo `0.164.0`, runs the Scala HOCON inventory/exporter, then builds Hugo into `static-site/public/`.

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

`data/projects.json`, `data/raw-validation.json`, `static/data/projects.json`, and `static/_redirects` are committed proof snapshots so Cloudflare Pages can build Hugo without a JVM. Regenerate and review them with:

```bash
sbt "runMain tools.StaticSiteExport"
```

## Cloudflare Pages preview configuration

When credentials and a non-production Pages project are available, configure the repository root as the build root with:

- **Build command:** `hugo --source static-site --destination public --minify`
- **Build output directory:** `static-site/public`
- **Environment variable:** `HUGO_VERSION=0.164.0`
- **Functions:** none

Use a preview deployment only. Do not attach the production custom domain or alter the Kubernetes/Play deployment during this proof.
