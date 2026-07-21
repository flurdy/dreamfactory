# Hugo / Cloudflare Pages proof report

**Bead:** `dreamfactory-lu1`
**Status:** Bounded proof reviewed and closed; canonical-data follow-up passes local gates, Pages preview remains deferred
**Date:** 2026-07-20

## Scope decision

This is the approved two-developer-day, non-production proof from `docs/static-site-generator-evaluation.md`. At the owner's direction, the proof is currently **local only**: it does not have Cloudflare credentials, an account/project ID, Node 20/Wrangler authentication, a Pages preview, a production custom domain, or production traffic.

## Implemented local proof

- Established `static-site/source/projects.json` as the canonical authored dataset.
  - A strict JSON Schema and Ajv validation reject unknown fields, unsupported values, invalid dates, route collisions, and URL-order drift.
  - The 16 raw HOCON discrepancies have explicit decisions in `docs/static-data-migration-decisions.md`; owners, keywords, and typo aliases are preserved rather than silently dropped.
  - A fixed-clock Play oracle records `2026-07-20T12:00:00Z` in UTC. Node generation matches its project fields and derived flags except the approved data corrections and deterministic tie ordering; separate homepage/list summary fields preserve each Play template's URL behavior.
  - Production-shaped Hugo builds generate data, browser catalog, and 216 redirects without Scala or SBT.
- Added a Hugo `0.164.0` proof under `static-site/`.
  - It builds the shared shell, home, all-project list, 72 detail pages, 72 help pages, 72 sponsor pages, representative query shells, a representative characteristic page, and `404.html`.
  - Detail pages carry rich HTML, URLs, versions, license, characteristics, tags, technologies, news, and comments from the exported data, using the same component structure and shared CSS as Play.
  - The homepage mirrors Play's introduction, project-summary URLs/statuses, search control, property shortcuts, taxonomy labels/order, and omits the breadcrumb exactly as Play does; popular/random project membership remains intentionally dynamic.
  - The all-project list renders all 72 Play-equivalent result rows in canonical order, including rich titles, summary URLs, status labels, property controls, and taxonomy discovery. The complete list remains available without JavaScript.
  - The build-time latest-news sidebar renders without JavaScript: desktop shows it directly, while mobile retains an HTML disclosure.
  - It vendors the current public assets and Bootstrap 3.3.6 CSS, and generates explicit title-alias redirects.
- Added a small browser catalog implementation.
  - It demonstrates search plus property filtering, technology filtering, and characteristic filtering.
  - Homepage JavaScript replaces the rendered no-JavaScript fallback on each load and preserves the current 10-item, seven-healthy-item selection shape while excluding the generated new/updated/popular sets.
  - Arbitrary-case aliases remain intentionally unsupported; canonical and explicit title aliases are the static compatibility boundary.
- Added reproducible local commands:
  - `scripts/build-static-site.sh`
  - `scripts/verify-static-site.sh`
  - `docker compose -f static-site/docker-compose.yml up --detach` for a production-shaped local nginx server.
  - `npm run test:static-browser` for a committed deterministic Playwright/nginx browser proof.
  - `npm run test:visual-parity` for fixed Play-versus-Hugo screenshots of three representative project slices.
  - `npm run test:list-visual-parity` for fixed desktop/mobile comparisons of the complete projects list.

## Evidence

| Check | Result |
|---|---|
| Canonical data migration | 72 projects validate against one schema. The original 16 discrepancies are fixed/classified, four owners and Expire keywords are preserved, two typo slugs are retained as aliases, and the raw inventory now reports zero unresolved issues. |
| Generated page shape | 216 project detail/help/sponsor pages, plus home/list/query/characteristic/404 pages. |
| Local artifact | 268 files, 4,348,366 bytes total; largest asset 240,026 bytes. This is below Cloudflare Pages Free's 20,000-file and 25 MiB-per-asset limits. |
| Acceptance benchmark | Play `sbt clean test stage` baseline: 30.24 s / 1,723,080 KB, 30.06 s / 1,702,384 KB, 30.46 s / 1,693,824 KB. Canonical static `npm run test:static-browser` (schema/oracle tests, generation, Hugo, link audit, nginx, browser/a11y): 8.47 s / 224,960 KB, 8.08 s / 223,804 KB, 8.88 s / 224,184 KB. Median wall time improves 72.0% and peak RSS 86.8%, so both approved 50% gates **pass**. |
| Production build reference | Three Node generation + clean Hugo builds: 0.35 s / 103,484 KB, 0.38 s / 106,512 KB, 0.37 s / 103,356 KB. |
| Static artifact verification | `scripts/verify-static-site.sh` passes, including repeated snapshot-regeneration comparison, route, rich-field, redirect, no-JS link, exclusion, healthy-ratio, and internal-link audit checks. The generated manifest has 216 explicit aliases. |
| Browser proof | `npm run test:static-browser` passes against Docker Compose/nginx: deterministic reload randomization, exclusion/healthy invariants, all-project list order/content with and without JavaScript, Play-oracle search/technology/characteristic results, keyboard focus, rich page content, build-time desktop/mobile latest-news behavior, negative-route 404, and no axe critical/serious violations on home/list/search/detail samples. |
| Project-list visual parity | `npm run test:list-visual-parity` passes full-page comparisons at 1280 px and 375 px. Differences are 0.21% and 0.16%, respectively, below the 1% gate. |
| Project-page visual parity | `npm run test:visual-parity` passes full-page comparisons for Gate House, Bad Usernames, and Gift Registry at 1280 px and 375 px. Differences range from 0.24% to 0.46%, below the 1% gate. |
| Existing application tests | `sbt test` passes: 5 tests, 0 failures. |
| Manual browser checks | Side-by-side local inspection confirmed the representative Hugo project page closely matches Play. Docker Compose/nginx checks production-shaped extensionless paths and 404 behavior locally. |

### Benchmark methodology

- Host: Linux 6.19, AMD Ryzen 7 7840U (16 logical CPUs), 63,566,572 KiB RAM.
- Tools: OpenJDK 17.0.15, Hugo 0.164.0 extended, Node 20.20.2, Chrome 148.0.7778.215, Docker 28.1.1, Compose 2.35.1.
- Dependency caches were retained; generated output was cleaned by each production build. Commands ran three times on the same host after prior warm-up activity.
- Play command: `/usr/bin/time -f 'wall=%e max_rss=%M' sbt clean test stage`.
- Static tested command: `/usr/bin/time -f 'wall=%e max_rss=%M' env PATH=/home/ivar/.nvm/versions/node/v20.20.2/bin:$PATH npm run test:static-browser`.
- Build-only references used `scripts/build-static-site.sh` and `hugo --source static-site --destination public --minify`, respectively. The tested command is the acceptance comparison because it includes the proof's verification and browser checks.

## Known gaps and decision impact

The canonical-data follow-up resolves the local data, fixed-time derivation, source-link, and benchmark gaps. Remaining migration gaps are tracked separately:

1. Query shells demonstrate only representative search/technology/characteristic cases; they do not yet reproduce the full tag, multi-value, related-filter, and eleven-property interaction matrix.
2. Remaining page families still need complete visual and interaction parity coverage; the all-project list now passes dedicated visual, accessibility, and no-JavaScript checks.
3. Cloudflare Pages preview, actual redirect/404 behavior, deployment headers/cache policy, and custom-domain rollback remain unverified. Local route output has only been verified against Docker Compose/nginx.

## Revised full-migration estimate

After the canonical-data slice, estimate **4–7 developer days** for the remaining migration:

- 2–3 days: complete projects-list, home/help/sponsor, and query/filter/related-filter parity.
- 1–2 days: full visual/a11y/link/contract coverage and Cloudflare Pages preview validation.
- 1 day: contributor/runbook documentation and custom-domain cutover/rollback rehearsal.
- Up to 1 contingency day for Pages URL/cache differences or rich-content cleanup.

This estimate excludes production observation time and assumes no Pages Function/Worker.

## Recommendation

The local mechanics evidence supports continuing with **Hugo on Cloudflare Pages Free** as the provisional direction: the generated artifact is small, the Hugo-only build is materially faster/lighter, and the current static constraints are understood.

The local candidate now passes the canonical-data, reproducibility, benchmark, representative visual, browser, and accessibility gates. Broader interaction/page parity and real Cloudflare Pages behavior remain outstanding in the approved migration sequence. Do not approve production cutover until those beads pass and rollback is rehearsed.
