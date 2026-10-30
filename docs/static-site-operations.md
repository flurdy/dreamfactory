# Static-site operations

Dream Factory is a Hugo static site hosted by Cloudflare Pages at
[code.flurdy.com](https://code.flurdy.com). There are no Pages Functions or
always-on application services. Play/Kubernetes was retired in July 2026 and is
not a rollback target; the legacy Cloud Build trigger is disabled.

## Develop and verify

Use Node `22.22.2`, Hugo Extended `0.164.0`, Docker Compose, and Chrome. From the
repository root:

```bash
nvm use
npm ci --ignore-scripts
make static-verify
```

Edit one JSON file per project under `static-site/source/projects/`. Do not edit
generated data, redirects, or `static-site/public/`. Follow the schema and
[catalog compatibility rules](static-data-migration-decisions.md).

`make static-verify` runs data and catalog tests, builds Hugo, checks deterministic
artifacts and links, then verifies routes, browser behavior and accessibility
against local nginx. It removes its preview container afterward. For focused
artifact checks use `make static-artifact-verify`; for a build use
`make static-build`.

For manual preview:

```bash
make static-preview-up
# http://localhost:4176/
make static-preview-down
```

For reproducible output, set `DREAMFACTORY_AS_OF` to an ISO timestamp with an
explicit timezone. Tests use `2026-07-20T12:00:00Z`; normal builds use build time.

## Deploy and accept

| Pages setting | Value |
|---|---|
| Project | `dreamfactory` in the Flurdy account |
| Production branch | `master` |
| Preview branches | All non-production branches |
| Build image | Pages V3 |
| Build command | `npm ci && scripts/build-static-site.sh` |
| Output directory | `static-site/public` |
| Environment | `NODE_VERSION=22.22.2`, `HUGO_VERSION=0.164.0` |
| Custom domain | `code.flurdy.com` |

Every remote Git action, production deployment, DNS mutation, and rollback needs
fresh owner approval immediately before execution. A push to `master` triggers a
production build; a local commit does not authorize that push.

Verify the exact deployment with its immutable URL:

```bash
PAGES_PREVIEW_BASE_URL=https://<deployment>.dreamfactory.pages.dev \
  make pages-preview-verify
```

The target checks the deployment's route manifest, aliases, expected 404s and
trailing-slash normalization. It also requires immediately revalidated HTML and
one-year immutable caching for referenced fingerprinted assets and catalog data.
Check the production domain after rollout as well.

Record the Git revision, immutable deployment URL, detected Node/Hugo versions,
build and verification results, artifact file/byte totals and largest file, and
any propagation errors. Pages build logs are authoritative; local tests do not
prove deployment success. Browser smoke checks should cover search, filtering,
random selection, representative detail/help/sponsor pages and console errors.

## Rebuild and monitor

Date-derived labels need regular rebuilds. Git integration handles commits;
[the nightly workflow](../.github/workflows/nightly-static-rebuild.yml) triggers a
build at `03:17 UTC` and supports manual dispatch. Its
`CLOUDFLARE_PAGES_DEPLOY_HOOK` Actions secret is a credential: never publish the
hook URL and rotate it if exposed. Investigate failed or missed builds.

Monitor route/redirect failures, missing or mixed-version assets/catalogs,
Cloudflare 5xx responses, browser errors and critical/serious accessibility issues.
Allow brief propagation after a successful deployment, but persistent failures
must block acceptance or trigger rollback.

## Troubleshoot and roll back

- **Schema or semantic validation:** fix the named canonical field, date, URL or
  route collision; do not weaken validation.
- **Snapshot mismatch:** use the fixed clock and review the approved content
  change; do not regenerate historical fixtures.
- **Link or browser failure:** reproduce locally and fix the source or a reviewed
  alias without hiding crawler errors or removing the no-JavaScript fallback.
- **Deployment failure:** inspect Pages logs before assuming the local result
  applies to production.

For rollback, identify a known-good Git revision or successful Pages production
deployment and record the failing revision. After separate approval, restore
through the normal Git/Pages path or select the known-good Pages deployment.
Re-run `make pages-preview-verify` against `https://code.flurdy.com` and the browser
smoke checks. Keep the failed deployment immutable for diagnosis. Never restore
the former Kubernetes origin.
