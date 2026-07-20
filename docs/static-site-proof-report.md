# Hugo / Cloudflare Pages proof report

**Bead:** `dreamfactory-lu1`
**Status:** Local mechanics evidence complete; proof acceptance incomplete and Pages preview deferred
**Date:** 2026-07-20

## Scope decision

This is the approved two-developer-day, non-production proof from `docs/static-site-generator-evaluation.md`. At the owner's direction, the proof is currently **local only**: it does not have Cloudflare credentials, an account/project ID, Node 20/Wrangler authentication, a Pages preview, a production custom domain, or production traffic.

## Implemented local proof

- Added `tools.StaticSiteExport`, a raw HOCON inventory and rendered-model exporter.
  - It independently validates the raw HOCON schema/value allow-list before model conversion.
  - It exports a 72-project snapshot, a 16-issue raw-validation report, generated aliases, and homepage selection metadata. Repeated regeneration is byte-stable within the same current time-derived state; fixed-time derivation remains migration work.
  - The known unsupported assignments in `badusernames.conf`, `gauge.conf`, `consensus.conf`, and `shop.conf` are asserted by `scripts/verify-static-site.sh`.
- Added a Hugo `0.164.0` proof under `static-site/`.
  - It builds the shared shell, home, all-project list, 72 detail pages, 72 help pages, 72 sponsor pages, representative query shells, a representative characteristic page, and `404.html`.
  - Detail pages carry rich HTML, URLs, versions, license, characteristics, tags, technologies, news, and comments from the exported data.
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

## Evidence

| Check | Result |
|---|---|
| Raw HOCON inventory | 72 rendered projects; 16 discrepancies reported; no discrepancy is silently ignored. |
| Generated page shape | 216 project detail/help/sponsor pages, plus home/list/query/characteristic/404 pages. |
| Local artifact | 268 files, 2,730,606 bytes total; largest asset 178,128 bytes. This is below Cloudflare Pages Free's 20,000-file and 25 MiB-per-asset limits. |
| Acceptance benchmark | Play `sbt clean test stage`: 30.24 s / 1,723,080 KB, 30.06 s / 1,702,384 KB, 30.46 s / 1,693,824 KB. Static `npm run test:static-browser` (which regenerates, verifies, builds, starts nginx, and runs browser/a11y tests): 44.00 s / 1,455,808 KB, 33.07 s / 1,085,132 KB, 32.34 s / 1,227,140 KB. The static median is 9% slower and uses 28% less peak RSS, so both approved 50% gates **fail**. |
| Build-only reference | Three clean-output exporter + Hugo builds: 9.74 s / 1,209,376 KB, 8.33 s / 1,072,228 KB, 8.53 s / 1,195,328 KB. Useful local feedback, but not substituted for the tested acceptance benchmark. |
| Hugo-only reference | Three clean-output builds from committed static snapshots: 0.12 s / 93,552 KB, 0.11 s / 93,808 KB, 0.11 s / 93,412 KB. This represents the intended Pages build after canonical static data exists, but is not substituted for the failed tested gate. |
| Static artifact verification | `scripts/verify-static-site.sh` passes, including repeated snapshot-regeneration comparison, route, rich-field, redirect, no-JS link, exclusion, healthy-ratio, and internal-link audit checks. The generated manifest has 213 explicit aliases. |
| Browser proof | `npm run test:static-browser` passes against Docker Compose/nginx: deterministic reload randomization, exclusion/healthy invariants, Play-oracle search/technology/characteristic results, keyboard focus, rich page content, negative-route 404, and no axe critical/serious violations on home/search/detail samples. |
| Existing application tests | `sbt test` passes: 5 tests, 0 failures. |
| Manual browser checks | Desktop and mobile-oriented local inspection confirmed that the reused shell/CSS renders and representative detail/list interactions are usable. It did not establish full visual parity. Docker Compose/nginx checks production-shaped extensionless paths and 404 behavior locally. |

### Benchmark methodology

- Host: Linux 6.19, AMD Ryzen 7 7840U (16 logical CPUs), 63,566,572 KiB RAM.
- Tools: OpenJDK 17.0.15, Hugo 0.164.0 extended, Node 20.20.2, Chrome 148.0.7778.215, Docker 28.1.1, Compose 2.35.1.
- Dependency caches were retained; generated output was cleaned by each production build. Commands ran three times on the same host after prior warm-up activity.
- Play command: `/usr/bin/time -f 'wall=%e max_rss=%M' sbt clean test stage`.
- Static tested command: `/usr/bin/time -f 'wall=%e max_rss=%M' env PATH=/home/ivar/.nvm/versions/node/v20.20.2/bin:$PATH npm run test:static-browser`.
- Build-only references used `scripts/build-static-site.sh` and `hugo --source static-site --destination public --minify`, respectively. The tested command is the acceptance comparison because it includes the proof's verification and browser checks.

## Known gaps and decision impact

The local implementation is sufficient to evaluate Hugo plus static Pages mechanics, but it **does not yet satisfy every proof acceptance criterion**:

1. The 16 raw-data discrepancies are reported but not classified/resolved; a full migration must make a source-truth decision for each.
2. The export's derived-state fields remain a current-rendered-behavior oracle. The full migration must compute them from raw dates/news with an injectable timestamp and keep dated fixtures.
3. Query shells demonstrate only representative search/technology/characteristic cases; they do not yet reproduce the full tag, multi-value, related-filter, and eleven-property interaction matrix.
4. Home/news/footer/help/sponsor/detail content is represented, but template structure and formatting are not yet pixel-equivalent. A fixed 1280×900 Gate House comparison differed in 483,224 of 1,152,000 pixels (41.95%), so the approved 1% visual-diff gate fails.
5. The link audit has no unclassified internal route failures, but records five existing source defects: stale `@routes...` content and four malformed `https:/github...` links. These require data cleanup before migration.
6. The acceptance-compliant tested benchmark misses both 50% gates: it is 9% slower and uses only 28% less peak RSS than Play. Canonical static data would remove SBT export and the production Pages build is represented by the much smaller Hugo-only reference, but that remains migration work rather than proven tested end-to-end evidence.
7. Cloudflare Pages preview, Pages redirect/404 behavior, deployment headers/cache policy, and custom-domain rollback are explicitly unverified because the owner chose local proof only.
8. The static route output has been verified against Docker Compose/nginx, not Cloudflare's path/redirect semantics. In particular, Pages preview remains required before any cutover decision.

## Revised full-migration estimate

If the remaining proof gates are accepted/completed, estimate **6–9 developer days** for the full migration:

- 1–2 days: classify/fix raw data, remove the Scala-export dependency, and establish canonical timestamped static data.
- 2–3 days: complete home/news/footer/help/sponsor/detail parity and the full query/filter/related-filter matrix.
- 1–2 days: visual/a11y/link/contract coverage and Cloudflare Pages preview validation.
- 1 day: custom-domain cutover/rollback rehearsal and contributor/runbook documentation.
- Up to 1 contingency day for Pages URL/cache differences or rich-content cleanup.

This estimate excludes production observation time and assumes no Pages Function/Worker.

## Recommendation

The local mechanics evidence supports continuing with **Hugo on Cloudflare Pages Free** as the provisional direction: the generated artifact is small, the Hugo-only build is materially faster/lighter, and the current static constraints are understood.

The bounded proof does **not** yet pass its acceptance contract because content/visual/a11y/Pages evidence is incomplete and the end-to-end RSS threshold failed. Do not approve full migration or production cutover. Next choose whether to (a) complete local content/quality parity and later obtain a non-production Pages preview, or (b) stop after this evidence and keep Play in production.
