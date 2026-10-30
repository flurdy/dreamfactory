# Cloudflare Pages operations

## Configuration

- Project: `dreamfactory`; production branch: `master`; previews: other branches.
- Build image: Pages V3; command: `npm ci && scripts/build-static-site.sh`.
- Output: `static-site/public`; no Functions.
- Set `NODE_VERSION` and `HUGO_VERSION` to the versions pinned in the [README](../README.md).
- A `master` push deploys production. Pushes, deployments, DNS changes and rollbacks
  each require fresh owner approval.

## Acceptance and rollback

```bash
PAGES_PREVIEW_BASE_URL=https://<deployment>.dreamfactory.pages.dev \
  make pages-preview-verify
```

This checks routes, redirects, 404s and cache headers. Check the production domain
and browser search/filter/random behavior too. Record the commit, immutable URL
and results; Pages logs—not local tests—establish build/deploy success.

For rollback, obtain approval to select a known-good Pages deployment or restore
a known-good Git revision. Recheck production with the command above using
`https://code.flurdy.com`. Keep the failed deployment for diagnosis. The retired
Kubernetes origin and disabled Cloud Build trigger are not rollback paths.

## Scheduled rebuilds

[The nightly workflow](../.github/workflows/nightly-static-rebuild.yml) refreshes
date-derived labels at `03:17 UTC`; it also supports manual dispatch. Its
`CLOUDFLARE_PAGES_DEPLOY_HOOK` secret must remain private. Investigate missed/failed
builds and persistent route, asset, catalog or Cloudflare 5xx errors.
