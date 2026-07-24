# Dream Factory

Dream Factory catalogs project ideas from initial thought through release. The production site is a Hugo static site hosted on Cloudflare Pages at [code.flurdy.com](https://code.flurdy.com).

## Project data

Canonical project data lives in [`static-site/source/projects/`](static-site/source/projects/), with one JSON file per project. Generated files under `static-site/data`, `static-site/static/data`, and `static-site/public` must not be edited directly.

## Local development

Use Node `22.22.2`, Hugo Extended `0.164.0`, Docker, and Chrome:

```bash
nvm use
npm ci --ignore-scripts
make static-verify
```

For a manual production-shaped preview:

```bash
make static-preview-up
# http://localhost:4176/
make static-preview-down
```

Contributor and Cloudflare Pages operations are documented in [`docs/static-site-operations.md`](docs/static-site-operations.md). Migration decisions and dated Play compatibility evidence remain under [`docs/`](docs/) and [`test/fixtures/static-site/`](test/fixtures/static-site/).
