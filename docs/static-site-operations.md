# Static-site contributor and operations runbook

- **Owner:** Ivar Abrahamsen / Flurdy
- **Repository:** `flurdy/dreamfactory`
- **Cloudflare account:** `Flurdy`
- **Pages project:** `dreamfactory`
- **Production:** `https://code.flurdy.com`
- **Preview alias:** `https://pages-preview.dreamfactory.pages.dev`

`code.flurdy.com` moved to Cloudflare Pages on 2026-07-22. The former Play/Kubernetes runtime was retired with explicit owner approval on 2026-07-24; it is no longer a rollback target.

## Contributor workflow

Canonical project data lives in `static-site/source/projects.json`. Do not edit generated files under `static-site/data`, `static-site/static/data`, or `static-site/public`.

1. Install Node `22.22.2`, Hugo Extended `0.164.0`, Docker, and Chrome.
2. Select Node and install dependencies:

   ```bash
   nvm use
   npm ci --ignore-scripts
   ```

3. Edit `static-site/source/projects.json`.
4. Run the complete local contract:

   ```bash
   make static-verify
   ```

This validates the JSON Schema and semantic invariants, regenerates derived data, builds Hugo, audits links/routes, starts the production-shaped nginx container, and runs browser/accessibility checks. It leaves no server running.

For manual preview:

```bash
make static-preview-up
# http://localhost:4176/
make static-preview-down
```

Set `DREAMFACTORY_AS_OF` to a timezone-qualified ISO timestamp when byte-reproducible output is required. Tests use `2026-07-20T12:00:00Z`; deployments derive current status at build time.

### Validation failures

- **Schema/Ajv error:** fix the named unknown field, invalid enum/date/URL, or missing field in the canonical JSON.
- **Semantic validation error:** resolve route/alias collisions, URL ordering, or unsupported rich content rather than weakening validation.
- **Generated snapshot mismatch:** rerun with the documented fixed clock and review the canonical source decision.
- **Broken internal route:** fix the source link or add a reviewed alias; do not mask it in the crawler.
- **Browser/a11y failure:** reproduce against `http://localhost:4176` while preserving the no-JavaScript fallback.
- **Fresh deployment `404`/`522`:** confirm the Pages deployment succeeded, then allow brief propagation before treating a persistent failure as a release issue.

## Cloudflare Pages configuration

| Setting | Value |
|---|---|
| Production branch | `master` |
| Preview deployments | All non-production branches |
| Build image | Pages V3 |
| Build command | `npm ci && scripts/build-static-site.sh` |
| Output directory | `static-site/public` |
| `NODE_VERSION` | `22.22.2` |
| `HUGO_VERSION` | `0.164.0` |
| Pages Functions | None |
| Custom domain | `code.flurdy.com` |

Validate a deployed candidate using its immutable URL where possible:

```bash
PAGES_PREVIEW_BASE_URL=https://<deployment>.dreamfactory.pages.dev \
  make pages-preview-verify
```

The route check consumes the deployment's generated manifest. The cache check requires revalidated HTML and one-year immutable caching for every referenced fingerprinted CSS, JavaScript, image, and catalog resource.

## Deployment evidence

For every candidate deployment, record:

- Git commit and branch.
- Immutable Pages deployment URL and branch alias.
- Build-stage result and detected Node/Hugo versions.
- Route-contract and cache-contract output.
- Artifact file count, total bytes, and largest file.
- Any transient propagation errors and their duration.

Cloudflare build logs are authoritative for clone, tool installation, build, upload, and deploy failures. A successful local build does not override a failed Pages stage.

## Scheduled rebuilds

Time-derived labels change even when source data does not. Pages Git integration handles commit builds; `.github/workflows/nightly-static-rebuild.yml` triggers a rebuild daily at `03:17 UTC` and supports manual dispatch.

The workflow uses the `CLOUDFLARE_PAGES_DEPLOY_HOOK` GitHub Actions secret. Treat the hook URL as a credential and rotate it if exposed. Alert on a missed or failed daily build rather than silently retaining stale derived statuses.

## Monitoring

Check:

- Pages deployment status and immutable URL.
- `/`, `/projects/`, representative detail/help/sponsor pages, and an expected 404.
- Generated route-manifest statuses and redirects.
- Fingerprinted asset/catalog availability and cache headers.
- Browser search/filter/random behavior and console errors.
- Critical/serious accessibility results.
- Cloudflare 5xx responses and unexpected redirect loops.

A persistent critical route, asset, catalog, or mixed-release failure should block or roll back the deployment. A single propagation response immediately after a successful deployment should be rechecked, not ignored.

## Pages rollback

Every production deployment, DNS mutation, rollback, and remote Git action requires fresh owner approval immediately before execution.

1. Identify a known-good Git revision or successful Pages production deployment.
2. Record the current failing deployment and diagnostics.
3. Restore the known-good revision through the normal Git/Pages path or use the Pages production rollback control.
4. Verify production with `PAGES_PREVIEW_BASE_URL=https://code.flurdy.com make pages-preview-verify` and the browser smoke checks.
5. Keep the failed deployment immutable for diagnosis and record restoration timing.

The former CNAME target `syndicate.kube.flurdy.net` and Kubernetes origin must not be used: those resources have been removed.

## Historical cutover and retirement evidence

Historical identifiers retained for diagnosis and audit—not as rollback instructions:

| Item | Recorded value |
|---|---|
| Cloudflare zone | `flurdy.com` (`d5f7c2bf6345ef27abec861f245d5bff`) |
| CNAME record | `code.flurdy.com` (`278db87299ccaf790501f66d48cfbefe`), proxied, Auto TTL |
| Cutover | `syndicate.kube.flurdy.net` → `dreamfactory.pages.dev` at `2026-07-22T21:48:11Z` |
| Pages activation | Domain attached `2026-07-22T21:47:26Z`; validation active `2026-07-22T21:51:36Z` |
| Former cluster | DigitalOcean `flurdynet-syndicate-01` (`7540eef4-6779-4899-b38e-2839cc1fa968`), namespace `apps` |
| Former ingress | `143.198.251.239`, `2a03:b0c0:2:f0::871e:4001` |
| Retirement inventory | App and nginx Deployments 2/2 available; app image `gcr.io/flurdynet/github.com/flurdy/dreamfactory:1.5.180` |
| Pre-retirement GitOps revision | `269cc3d7627ca6371f196e2f1359e5ccb06d0412` |
| Retirement GitOps revision | `66aaaf08f0693a06925fe51a34695aa2f61052f1` |

Detailed migration benchmarks, compatibility decisions, deployment evidence, and fixtures also remain in:

- `docs/static-site-proof-report.md`
- `docs/static-site-generator-evaluation.md`
- `docs/static-data-migration-decisions.md`
- `test/fixtures/static-site/`

The owner explicitly ended the planned Play rollback period early on 2026-07-24. GitOps commit `66aaaf08f0693a06925fe51a34695aa2f61052f1` removed the Dream Factory deployments, services, ingress, nginx ConfigMap, image policy, and image repository from `flurdy/flurdynet-syndicate`. Flux applied that revision, all named resources were absent afterward, and the production route contract continued to pass against Cloudflare Pages.
