# Hugo / Cloudflare Pages proof report

**Bead:** `dreamfactory-lu1`
**Status:** Pages production; Play/Kubernetes retired
**Date:** 2026-07-24

## Scope decision

This began as the approved two-developer-day, non-production proof from `docs/static-site-generator-evaluation.md` and now includes Pages preview, canonical production, scheduled rebuild, custom-domain, and legacy-retirement evidence. `code.flurdy.com` moved to Pages on 2026-07-22 with no Functions or always-on service. The owner ended the Play rollback period and approved runtime/source retirement on 2026-07-24.

## Implemented local proof

- Established `static-site/source/projects.json` as the canonical authored dataset.
  - A strict JSON Schema and Ajv validation reject unknown fields, unsupported values, invalid dates, route collisions, and URL-order drift.
  - The 16 raw HOCON discrepancies have explicit decisions in `docs/static-data-migration-decisions.md`; owners, keywords, and typo aliases are preserved rather than silently dropped.
  - A fixed-clock Play oracle records `2026-07-20T12:00:00Z` in UTC. Node generation matches its project fields and derived flags except the approved data corrections and deterministic tie ordering; separate homepage/list summary fields preserve each Play template's URL behavior.
  - Production-shaped Hugo builds generate data, browser catalog, and 216 redirects without Scala or SBT.
- Added a Hugo `0.164.0` proof under `static-site/`.
  - It builds the shared shell, home, all-project list, 72 detail pages, 72 help pages, 72 sponsor pages, representative query shells, a representative characteristic page, and `404.html`.
  - Detail pages carry rich HTML, URLs, versions, license, characteristics, tags, technologies, news, and comments from the exported data, using the same component structure and shared CSS as Play.
  - The homepage mirrors Play's introduction, project-summary URLs/statuses, search control, property shortcuts, taxonomy labels/order, and omits the breadcrumb exactly as Play does. Its Random box remains dynamic after enhancement and retains a valid deterministic no-JavaScript fallback.
  - The all-project list renders all 72 Play-equivalent result rows in canonical order, including rich titles, summary URLs, status labels, property controls, and taxonomy discovery. The complete list remains available without JavaScript.
  - The build-time latest-news sidebar renders without JavaScript: desktop shows it directly, while mobile retains an HTML disclosure.
  - It vendors the current public assets and Bootstrap 3.3.6 CSS, and generates explicit title-alias redirects.
- Added a progressive browser catalog implementation.
  - It reproduces Play search, singular/plural tag and technology intersections, all eleven Include/Exclude property filters, characteristic aliases, related controls, context-preserving forms, counts, empty states, and result focus.
  - A 47-case rendered Play fixture covers every property in both states plus combined and route-specific behavior; a pure query engine and browser checks enforce the contract.
  - Every query route renders the complete rich project list before enhancement, so users retain a semantic no-JavaScript or fetch-failure fallback.
  - Homepage JavaScript replaces the rendered no-JavaScript fallback on each load and preserves the current 10-item, seven-healthy-item selection shape while excluding the generated new/updated/popular sets.
  - Arbitrary-case project aliases remain intentionally unsupported; canonical and explicit title aliases are the static compatibility boundary.
- Migration acceptance recorded reproducible local commands:
  - `scripts/build-static-site.sh`
  - `scripts/verify-static-site.sh`
  - `docker compose -f static-site/docker-compose.yml up --detach` for a production-shaped local nginx server.
  - `npm run test:static-browser` for a committed deterministic Playwright/nginx browser proof.
  - `npm run test:visual-parity` for fixed Play-versus-Hugo screenshots of representative detail, help, and sponsor slices.
  - `npm run test:list-visual-parity` for fixed desktop/mobile comparisons of the complete projects list.
  - `npm run test:homepage-visual-parity` for an opt-in deterministic Play homepage fixture compared with Hugo's no-JavaScript Random fallback.
  - `npm run test:static-route-contract` to crawl each deployment's generated route manifest; Pages mode also verifies every `_redirects` response and trailing-slash normalization.
  - `npm run test:pages-preview` to require revalidated HTML and immutable Hugo-fingerprinted CSS, JavaScript, images, and catalog data.
  - Live Play capture and visual-parity commands were removed after retirement; their dated results and fixtures remain as historical evidence.

## Evidence

| Check | Result |
|---|---|
| Canonical data migration | 72 projects validate against one schema. The original 16 discrepancies are fixed/classified, four owners and Expire keywords are preserved, two typo slugs are retained as aliases, and the raw inventory now reports zero unresolved issues. |
| Generated page shape | 216 project detail/help/sponsor pages, plus home/list/query/characteristic/404 pages. |
| Local artifact | 297 files, 7,651,961 bytes total; largest asset 246,851 bytes. This is below Cloudflare Pages Free's 20,000-file and 25 MiB-per-asset limits. |
| Acceptance benchmark | Play `sbt clean test stage` baseline: 30.24 s / 1,723,080 KB, 30.06 s / 1,702,384 KB, 30.46 s / 1,693,824 KB. Canonical static `npm run test:static-browser` (schema/oracle tests, generation, Hugo, link audit, nginx, browser/a11y): 8.47 s / 224,960 KB, 8.08 s / 223,804 KB, 8.88 s / 224,184 KB. Median wall time improves 72.0% and peak RSS 86.8%, so both approved 50% gates **pass**. |
| Production build reference | Three Node generation + clean Hugo builds: 0.35 s / 103,484 KB, 0.38 s / 106,512 KB, 0.37 s / 103,356 KB. |
| Static artifact verification | `scripts/verify-static-site.sh` passes, including repeated snapshot-regeneration comparison, route, rich-field, redirect, no-JS link, exclusion, healthy-ratio, and internal-link audit checks. `route-manifest.json` rejects duplicate canonical paths, duplicate/colliding redirect sources, non-canonical redirect targets, and redirect loops; the fingerprinted build records 293 canonical routes, 216 explicit aliases, and two expected 404s. |
| Catalog contract | `npm run test:static-catalog` matches 47 rendered Play cases: all eleven properties in Include and Exclude modes, combined filters, search edge behavior, singular/plural tag and technology intersections, canonical and alias characteristics, related terms, and preserved form context. |
| Browser proof | `npm run test:static-browser` passes against Docker Compose/nginx on Node 22.22.2: all 293 canonical manifest routes return 200; expected arbitrary-case/missing project routes return 404; deterministic reload randomization, exclusion/healthy invariants, rich filtered rows, plural and alias routes, filter reset, keyboard focus, empty/fetch-failure states, complete no-JavaScript fallback, help/sponsor content and payment-control checks, build-time desktop/mobile latest-news behavior, and no axe critical/serious violations on representative home, catalog, detail, help, and sponsor states. |
| Homepage visual parity | `npm run test:homepage-visual-parity` passes full-page deterministic Play comparisons at 1280 px and 375 px. Differences are 0.77% and 0.75%, below the 1% gate. The fixture is opt-in; normal Play shuffling and Hugo's enhanced reload randomization remain unchanged. |
| Project-list visual parity | `npm run test:list-visual-parity` passes full-page Play comparisons for the unfiltered list, filtered search, plural technologies, and a characteristic alias at 1280 px and 375 px. Differences range from 0.17% to 0.53%, below the 1% gate. |
| Project-page visual parity | `npm run test:visual-parity` passes full-page comparisons for Gate House, Bad Usernames, Gift Registry, Gate House help, and Gate House sponsor at 1280 px and 375 px. Differences range from 0.08% to 0.40%, below the 1% gate. |
| Migration baseline application tests | Before retirement, `sbt test` passed: 6 tests, 0 failures. |
| Cloudflare Pages deployment | Git-connected `dreamfactory` builds with Node 22.22.2 and Hugo 0.164.0 on Pages V3. Preview, immutable production, deploy-hook production, and `https://code.flurdy.com` pass 293 canonical routes, 216 redirects, two expected 404s, Pages `308` trailing-slash normalization, and cache checks for revalidated HTML plus 10 referenced immutable fingerprinted resources. |
| Production cutover | GitHub Actions run `29950485572` successfully triggered deploy-hook release `fff86ae6`. Pages custom domain and CNAME switched on 2026-07-22; transient 522s cleared in roughly 75 seconds, full Pages activation completed in about 3 minutes 25 seconds, and production route/cache/browser smoke checks passed. |
| Preview rollback rehearsal | The branch alias moved from corrected deployment `bafadac7` to prior-policy deployment `56cca894` via an audited tree-restore commit, while both immutable deployment URLs retained distinct catalog fingerprints. A forward-restore created `06dae2a2`; final Node 22 deployment `cfd10673` passes both contracts. The production-only Pages rollback API was not invoked. |
| Manual browser checks | Side-by-side local inspection confirmed the representative Hugo project page closely matches Play. Docker Compose/nginx and the Pages preview verify extensionless/trailing-slash paths and 404 behavior. |

### Benchmark methodology

- Host: Linux 6.19, AMD Ryzen 7 7840U (16 logical CPUs), 63,566,572 KiB RAM.
- Tools: OpenJDK 17.0.15, Hugo 0.164.0 extended, Node 22.22.2 (final preview; original benchmarks used 20.20.2), Chrome 148.0.7778.215, Docker 28.1.1, Compose 2.35.1.
- Dependency caches were retained; generated output was cleaned by each production build. Commands ran three times on the same host after prior warm-up activity.
- Play command: `/usr/bin/time -f 'wall=%e max_rss=%M' sbt clean test stage`.
- Static tested command: `/usr/bin/time -f 'wall=%e max_rss=%M' env PATH=/home/ivar/.nvm/versions/node/v20.20.2/bin:$PATH npm run test:static-browser`.
- Build-only references used `scripts/build-static-site.sh` and `hugo --source static-site --destination public --minify`, respectively. The tested command is the acceptance comparison because it includes the proof's verification and browser checks.

## Accepted compatibility boundaries

The Hugo-only site supports canonical characteristic paths and every declared lowercase Play alias, but not arbitrary path casing. Malformed tag/technology URLs render an empty 200 shell instead of Play's former 400 response. Generated forms never produce either shape, and exact parity would require an intentionally out-of-scope edge function.

The owner accepted ending the planned observation period early on 2026-07-24 and explicitly approved retirement. GitOps commit `66aaaf08f0693a06925fe51a34695aa2f61052f1` removed the Dream Factory Kubernetes workload and image automation. Flux applied the revision, all named resources were absent afterward, and the production route contract still passed against `https://code.flurdy.com`.

## Outcome

Hugo on Cloudflare Pages is the production architecture. The repository retains canonical data, static build tooling, dated migration fixtures, decision records, and Git history. The Play/SBT/HOCON source, JVM container build, live parity tooling, and Kubernetes runtime have been retired.
