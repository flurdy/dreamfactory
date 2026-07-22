# Static-site contributor and operations runbook

- **Owner:** Ivar Abrahamsen / Flurdy
- **Repository:** `flurdy/dreamfactory`
- **Cloudflare account:** `Flurdy`
- **Pages project:** `dreamfactory`
- **Validated preview:** `https://pages-preview.dreamfactory.pages.dev`

Production deployments, the custom domain, and legacy cleanup remain disabled until `dreamfactory-cvc` is explicitly approved.

## Contributor workflow

Project source data lives in `static-site/source/projects.json`. Do not edit generated files under `static-site/data`, `static-site/static/data`, or `static-site/public`.

1. Install Node `22.22.2`, Hugo Extended `0.164.0`, Docker, and Chrome.
2. Select the pinned Node version and install dependencies:

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

Set `DREAMFACTORY_AS_OF` to a timezone-qualified ISO timestamp when byte-reproducible output is required. Tests use `2026-07-20T12:00:00Z`; normal deployments derive current status at build time.

### Validation failures

- **Schema/Ajv error:** fix the named unknown field, invalid enum/date/URL, or missing required field in `static-site/source/projects.json`.
- **Semantic validation error:** resolve duplicate routes/aliases, case-insensitive collisions, URL ordering, or unsupported rich content rather than weakening validation.
- **Generated snapshot mismatch:** rerun with the documented fixed clock and review the canonical source decision.
- **Broken internal route:** fix the source link or declare a reviewed alias; do not mask it in the crawler.
- **Browser/a11y failure:** reproduce against `http://localhost:4176`, preserving the no-JavaScript fallback.
- **Pages `308`:** extensionless directory paths normalize to a trailing slash on Pages and are part of the accepted contract.
- **Fresh deployment `404`/`522`:** first confirm the Pages deployment stage is `success`; immutable URLs can take several seconds to propagate. Persistent failures are not acceptable.

## Cloudflare Pages configuration

The Git-connected project uses:

| Setting | Value |
|---|---|
| Production branch | `master` |
| Production deployments | Disabled during migration |
| Preview deployments | All non-production branches |
| Build image | Pages V3 |
| Build command | `npm ci && scripts/build-static-site.sh` |
| Output directory | `static-site/public` |
| `NODE_VERSION` | `22.22.2` |
| `HUGO_VERSION` | `0.164.0` |
| Pages Functions | None |
| Custom domains | None before cutover |

`dreamfactory.pages.dev` currently serves unrelated pre-existing content and is not a valid test target. Use the branch alias or an immutable deployment URL.

Validate a deployed preview with:

```bash
PAGES_PREVIEW_BASE_URL=https://pages-preview.dreamfactory.pages.dev \
  make pages-preview-verify
```

The route check consumes that deployment's own timestamped manifest. The cache check requires revalidated HTML and one-year immutable caching for every referenced fingerprinted CSS, JavaScript, image, and catalog resource.

## Deployment evidence and diagnosis

For every candidate deployment, record:

- Git commit and branch.
- Immutable Pages deployment URL and stable branch alias.
- Build-stage result and detected Node/Hugo versions.
- Route-contract and cache-contract output.
- Artifact file count, total bytes, and largest file.
- Any transient propagation errors and their duration.

Cloudflare build logs are the source of truth for clone, tool installation, build, upload, and deploy failures. A successful local build does not override a failed Pages stage.

The validated Node 22 deployment is `cfd10673.dreamfactory.pages.dev`. Preview evidence and the rollback rehearsal are recorded in `docs/static-site-proof-report.md`.

## Scheduled rebuilds

Current derived labels change with time even when source data does not. There is currently no GitHub Actions workflow; Pages Git integration is the only deployment CI. Before production cutover, create a Pages deploy hook for branch `master` and store its URL as the GitHub Actions secret `CLOUDFLARE_PAGES_DEPLOY_HOOK`. Treat the URL as a credential and rotate it if exposed.

Add a scheduled workflow that POSTs the hook once daily, for example at `03:17 UTC`. The workflow must also support manual dispatch. A successful hook must create a production deployment from the current `master`; it must never commit generated data.

Cutover is blocked until one scheduled rebuild has completed and passed the production route/cache smoke checks. Alert on a missed or failed daily build; do not silently retain stale derived statuses.

## Monitoring

During preview, cutover, and the observation window, check:

- Pages deployment stage and immutable URL.
- `/`, `/projects/`, representative detail/help/sponsor pages, and an expected 404.
- All route-manifest statuses and explicit redirects.
- Fingerprinted asset and catalog availability/cache headers.
- Browser search/filter/random behavior and console errors.
- Critical/serious accessibility results on representative pages.
- Cloudflare 5xx responses and unexpected redirect loops.

Rollback immediately for a persistent critical route/asset/catalog failure, mixed release resources, or two consecutive 5xx monitoring intervals over five minutes. A single propagation response immediately after a successful deployment should be rechecked, not ignored.

## Production cutover gate

Every deployment, DNS mutation, and remote Git action requires fresh owner approval immediately before execution.

### Recorded baseline

| Item | Current value |
|---|---|
| DNS owner | Ivar Abrahamsen / Flurdy Cloudflare account |
| Zone | `flurdy.com` (`d5f7c2bf6345ef27abec861f245d5bff`) |
| Record | CNAME `code.flurdy.com` |
| Record ID | `278db87299ccaf790501f66d48cfbefe` |
| Current target | `syndicate.kube.flurdy.net` |
| Proxy | Enabled |
| TTL | Cloudflare Auto (`1` in API) |
| Legacy runtime owner | Ivar Abrahamsen |

The local `paperboy` Kubernetes context is stale and its DigitalOcean cluster no longer resolves. Before cutover, the owner must refresh access and record the live Dreamfactory Deployment, Service, Ingress, image, replica count, and direct health check. Do not infer that the Play runtime is removable from the stale context.

### Cutover procedure

1. Confirm `master` is clean, pushed, and locally verified.
2. Refresh and record the live Play/Kubernetes inventory and direct health check.
3. Capture the current Cloudflare DNS record and Play response headers/content again.
4. Enable Pages production deployments and build the approved `master` commit without attaching a custom domain.
5. Validate its immutable production URL with route, cache, browser, and accessibility checks.
6. Confirm the scheduled rebuild hook and monitoring are active.
7. Obtain explicit owner approval for the custom-domain/DNS change.
8. Attach `code.flurdy.com` to the Pages project and follow Cloudflare's ownership/DNS flow. Do not alter unrelated zone records.
9. Verify TLS, route/cache contracts, browser smoke tests, and the expected 404 through `https://code.flurdy.com`.
10. Record actual propagation time and start a seven-day observation window.

Because the record is proxied with Auto TTL, do not claim zero propagation. Allow up to 15 minutes before declaring the cutover failed, while monitoring both the custom domain and immutable deployment URL.

## Restoration to Play

Keep the Play image, Kubernetes resources, configuration, and the recorded CNAME target unchanged throughout the observation window.

1. Declare the rollback reason and obtain explicit owner approval.
2. Remove the Pages custom-domain binding for `code.flurdy.com`.
3. Restore CNAME record `278db87299ccaf790501f66d48cfbefe` to `syndicate.kube.flurdy.net`, proxied, TTL Auto. If Cloudflare replaced the record, recreate the equivalent record and capture its new ID.
4. Verify `https://code.flurdy.com/` serves the Play application and its fingerprinted Play assets.
5. Run representative home/list/detail/help/sponsor/search checks and confirm the Kubernetes workload is healthy.
6. Record restoration propagation time and keep the failed Pages deployment immutable for diagnosis.

Preview rollback uses an audited commit whose tree matches a prior preview, followed by a forward-restore commit. The Pages rollback API is production-only and must be rehearsed separately after an approved production deployment exists.

## Legacy retirement

Do not delete Play/SBT/HOCON, Docker, Kubernetes, or origin records during cutover. Retirement requires all of:

- Seven consecutive days of healthy Pages production monitoring.
- At least one successful scheduled rebuild.
- No unresolved route, asset, catalog, browser, accessibility, or client-error regression.
- A recorded successful restoration rehearsal and owner sign-off.
- Canonical edits occurring only in `static-site/source/projects.json`.
- Separate explicit approval on `dreamfactory-cvc`.

Only then may cleanup remove `app/`, `conf/dreams.d/`, SBT/Play build files, Docker/Kubernetes deployment paths, and obsolete HOCON migration tooling. Preserve Git history and the cutover evidence.
