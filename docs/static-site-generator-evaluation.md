# Static-site generator evaluation

**Status:** Proof approved; full migration is not yet approved
**Date:** 2026-07-19
**Bead:** `dreamfactory-4mb`

## Recommendation

Choose **Hugo on Cloudflare Pages Free as the target static deployment**, subject to a **two-developer-day proof of concept** that passes the representative parity gates below. Keep Play in production until the proof passes; do not start either the proof or the full migration from this document alone. The proof is a decision aid, not a nearly complete parallel implementation.

Dream Factory is now a content catalog rather than an application server: all content routes are GET-only, 72 projects are loaded from 29 HOCON files, and there is no database, authentication, write path, or server integration. Derived statuses and latest/new/updated lists can be generated at build time. Catalog queries and the homepage random boxes must run over a small static catalog in the browser: the current boxes change on every page reload, so build-time-only randomization is not acceptable except as the no-JavaScript fallback.

Hugo is the best fit because it provides data-driven page generation, taxonomies, explicit URL control, and an asset pipeline in one executable. Cloudflare Pages Free provides an appropriate static host already proven by `blog.flurdy.com`, removing the JVM/Kubernetes workload for static traffic. Jekyll would introduce a Ruby/Gem/GCC toolchain without a compensating capability. A custom generator could preserve HOCON and Scala logic, but would retain most of the current build burden while making Dream Factory responsible for its own generator.

The material caveat is filtering: today search and filters work without JavaScript because Play renders every query. A purely static deployment can preserve the existing query URLs, but exact multi-filter behavior must run client-side. If no-JavaScript filtering is a hard requirement, retain Play (or add an edge/serverless query renderer) instead of completing the migration.

## Current evidence and baseline

| Area | Evidence |
|---|---|
| Content | 72 rendered projects from 29 files under `conf/dreams.d/`; the HOCON files contain 75,634 logical bytes (73.9 KiB). |
| HTTP surface | `conf/routes` defines 11 GET content routes plus static assets; there are no POST/PUT/PATCH/DELETE routes. |
| Runtime behavior | `app/controllers/HomeController.scala`, `app/controllers/ProjectController.scala`, `app/models/ProjectLookup.scala`, and `app/models/ProjectFilters.scala` implement selection, search, taxonomy, and property filtering over in-memory files. |
| Pages | Every project has detail, help, and sponsor routes; shared latest-news content is rendered by `app/views/newsbar.scala.html`. |
| Assets | Static assets under `public/` contain about 161 KB. Bootstrap 3 and jQuery are supplied by WebJars in `app/views/head.scala.html`; repository search found no jQuery or Bootstrap-JS usage. `filter.js` manages filter forms and `shell.js` changes responsive newsbar state. |
| Data risk | At least 15 project files contain trusted HTML fragments. Some content also contains stale Play route syntax, for example `@routes.ProjectController.ideas()` in `conf/dreams.d/tapin.conf`. The proof's raw inventory currently reports 16 discrepancies: unsupported values (including `appeal=high` twice, `appeal=somewhat`, `status.development="not started"`, `complexity="very high"`, and `release=abandoned`) plus unknown fields such as `comlexity`, `encode`, `keywords`, and `owner`. |
| Tests | `test/controllers/ProjectControllerSpec.scala` currently has five controller tests focused on list/filter behavior. |
| Build baseline | On this machine with dependencies cached, `sbt clean test stage` took 30.86 seconds, peaked at 1,702,800 KB RSS, and produced a 52 MB staged application with 284 files. This is a local baseline, not a cross-machine benchmark. |
| Deployment | `Dockerfile` builds and runs a JVM application in the current Kubernetes path; `cloudbuild.yaml` publishes versioned container images. `blog.flurdy.com` already demonstrates this owner’s Cloudflare Pages/Jekyll workflow. |

Date-derived properties are currently calculated from `DateTime.now` in `app/models/models.scala` when the project repository is loaded. Recomputing them at static build time therefore matches the current deployment/restart model; a scheduled rebuild may improve freshness later.

## Generator comparison

| Criterion | Retain Play | Hugo | Jekyll | Minimal custom generator |
|---|---|---|---|---|
| Maintainability | Keeps working code, but retains Play 2.8, Scala/SBT, Java, Twirl, and WebJar upkeep for a read-only site. | One executable and a purpose-built static model; Go templates are a new but bounded skill. | Mature and capable, but adds Ruby, RubyGems, GCC, Make, Liquid, and plugin maintenance. | Full control, but templates, routing, validation, taxonomy, assets, and generator tests become local code. |
| HOCON/data | Native today. | No HOCON support; official data formats include JSON, TOML, YAML, XML, and CSV. Requires one-time conversion. | No HOCON support; `_data` supports YAML, JSON, CSV, and TSV. Requires one-time conversion. | A Scala bridge can reuse current parsing, but permanent Scala keeps the heavy toolchain; a new parser adds dependency risk. |
| Project/taxonomy pages | Implemented dynamically. | Content adapters can create pages from data; built-in taxonomies generate term/list pages. Strong fit. | Collections and data files can model projects, but taxonomy/query pages need more custom Liquid/plugin work. | Must be designed and maintained locally. |
| URL preservation | Exact current behavior. | Explicit page URLs plus generated compatibility shells/hosting rewrites can preserve routes; must prove case, spaces, query endpoints, help, and sponsor paths. | Permalinks support explicit paths; the same query-shell limitation applies. | Exact control, with all edge cases owned locally. |
| Search/filtering | Server-rendered and progressively enhanced. | Small generated `catalog.json` plus vanilla JavaScript can reproduce exact semantics. Hugo itself does not answer query strings. | Same client-side requirement. | Can generate the catalog, but still needs browser filtering or a runtime. |
| Random/new/updated | Runtime Scala implementation. | New/updated/popular can be build-derived. Random can use a server-rendered fallback plus a small client shuffle matching current exclusions. | Feasible, with more Liquid/custom code. | Feasible, but all selection logic is bespoke. |
| Assets | WebJars and Play fingerprinting. | Hugo Pipes can bundle, minify, fingerprint, and publish assets. Vendor the pinned Bootstrap CSS; remove unused jQuery/Bootstrap JS only after visual regression checks. | Built-in Sass support, but JavaScript bundling needs additional tooling/plugins. | Copying is simple; robust fingerprinting/bundling is additional local work. |
| Build/deploy footprint | Measured 30.86 s clean build and 52 MB staged app, plus a JRE runtime image. | Expected to be materially smaller/faster; Cloudflare Pages can host the static output directly, avoiding a runtime container/Kubernetes workload. The proof must measure output size and build time. | Static output can also deploy to Cloudflare Pages, but the build needs the Ruby toolchain. | Scala variant keeps current build cost; another language creates a new custom toolchain. |
| Contributor workflow | Requires compatible Java/SBT/Scala. | Pinned Hugo executable plus content/schema checks. | Requires Ruby/Gems and native build tools. | Depends on local implementation and documentation quality. |

### External source evidence

- Hugo officially supports a single executable, data-driven pages, user-defined taxonomies, URL management, and CSS/JavaScript asset processing: <https://gohugo.io/about/features/>.
- Hugo data sources support CSV, JSON, TOML, YAML, and XML: <https://gohugo.io/content-management/data-sources/>.
- Hugo content adapters can create pages during a build from structured data: <https://gohugo.io/content-management/content-adapters/>.
- Hugo taxonomies automatically create taxonomy and term listing pages: <https://gohugo.io/content-management/taxonomies/>.
- Jekyll data files support YAML, JSON, CSV, and TSV: <https://jekyllrb.com/docs/datafiles/>.
- Jekyll installation requires Ruby 2.7+, RubyGems, GCC, and Make: <https://jekyllrb.com/docs/installation/>.
- Jekyll supports explicit and collection permalink structures: <https://jekyllrb.com/docs/permalinks/>.
- Pagefind can add post-build full-text search and metadata filters: <https://pagefind.app/docs/filtering/>. It is not recommended for the first migration because Dream Factory still needs custom include/exclude property logic, and 72 catalog records are small enough for one client-side engine.
- Cloudflare Pages documents Git-driven Jekyll builds and preview deployments: <https://developers.cloudflare.com/pages/framework-guides/deploy-a-jekyll-site/>. This matches the existing `blog.flurdy.com` deployment model.
- Cloudflare Pages Free limits currently include 500 builds/month, 20,000 files/site, and 25 MiB/asset: <https://developers.cloudflare.com/pages/platform/limits/>. Static asset requests are free/unlimited when no Function runs: <https://developers.cloudflare.com/pages/functions/pricing/>.
- Pages `_redirects` supports explicit paths but not general case-insensitive matching or query-parameter rewrites: <https://developers.cloudflare.com/pages/configuration/redirects/>.

## Feature-parity design

### Canonical data

1. Inventory raw HOCON keys and values before using the Scala models. Fail on unknown keys/values and explicitly classify each discrepancy as source truth, accepted alias, or current rendering defect.
2. Add a one-time Scala exporter that uses the existing HOCON/model parsing as the **rendered-behavior oracle**, not as proof that the source was lossless.
3. Export normalized project records to JSON, including encoded and title aliases, raw rich-text fields, dates, URLs, versions, tags, technologies, license, news/comments, and characteristics. Keep raw dates/news canonical; do not freeze time-derived property flags into content.
4. Produce a dated oracle fixture containing the current derived flags and an explicit build timestamp. Recompute those flags in the static build from raw dates using an injectable timestamp.
5. Make JSON (or one JSON/YAML content file per project) the only canonical source at cutover; do not keep a permanent dual-write HOCON/JSON workflow.

The raw validator must continue to report the known unsupported assignments in `badusernames.conf`, `gauge.conf`, `consensus.conf`, and `shop.conf`, while reporting—not suppressing—new discrepancies; its current baseline is 16 issues. Silently converting any of them would reproduce data loss. Hugo should create project content through a content adapter or generated content files. Explicit legacy URLs are required because current fallback links preserve title case and spaces, while Hugo normally normalizes logical paths.

### Generated pages and routes

- Generate `/`, `/projects/`, and all 72 canonical `/project/<legacy-link>` pages.
- Generate help and sponsor pages for every project at their existing paths.
- Build a compatibility manifest for both encoded and title aliases. Play accepts either value without regard to case; Cloudflare Pages static redirects cannot provide general case-insensitive matching. The recommended Free static path publishes canonical routes and explicit redirects for known encoded/title aliases (including help/sponsor suffixes) and intentionally drops arbitrary-case URLs. If retaining arbitrary-case URLs is mandatory, reject this Pages Free plan and retain Play pending a separately approved Worker/function cost and operations decision. Do not imply that static Pages alone preserves arbitrary casing.
- Generate every defined characteristic path.
- Publish static shells for `/projects/search`, `/projects/tag`, `/projects/tags`, `/projects/tech`, and `/projects/technologies`; read current query parameters with `URLSearchParams` and render from `catalog.json`.
- Preserve `/assets/*`. During the first release, also map the WebJar URLs used by the current markup or replace them only after the route crawl proves every generated page references the vendored assets.
- Keep exact old paths through generated static pages and a Pages `_redirects` file. Pages supports up to 2,000 static and 100 dynamic redirects per file, which is sufficient for the expected explicit alias set but must be checked against the generated manifest. Generate a top-level `404.html`; unsupported aliases and unknown project/detail/help/sponsor paths must return a 404, not an SPA/homepage fallback. Do not rely on unverified trailing-slash redirects or query-parameter rewrite rules.

### Listings, search, and filters

Generate `catalog.json` with only fields needed by list rendering. A small dependency-free module should reproduce:

- title/description search with current Play semantics;
- tag and technology intersection;
- characteristic selection;
- all 11 Any/Include/Exclude property filters;
- related tag/technology choices derived from the filtered set;
- query-string and form behavior, keyboard operation, result count, empty state, and focus/announcement behavior.

Render the all-projects list in HTML as a no-JavaScript fallback. Query-specific filtering will require JavaScript unless a dynamic edge renderer is retained.

### Homepage and latest news

- Compute derived flags, newest, updated, popular, and latest-news lists at build time from raw data and the injected build timestamp.
- Render a valid build-time random fallback only for no-JavaScript users.
- With JavaScript enabled, reshuffle the homepage random section on every page load using the current size, overlap exclusions, and healthy-project ratio from `ProjectLookup.findRandomProjects`. This behavior is required, not optional.
- Trigger a rebuild on content changes and nightly, so three-year/eight-year date thresholds cannot remain stale indefinitely. Tests use a fixed timestamp.

### Assets and analytics

- Carry forward the current CSS, images, `shell.js`, and filter behavior before any redesign.
- Vendor the pinned Bootstrap 3 CSS. Repository evidence indicates jQuery and Bootstrap JS are unused, but remove them only after the Playwright comparison passes.
- Use Hugo fingerprinting for local CSS/JS and the generated catalog. Publish all version-coupled files atomically through the Pages deployment.
- Preserve the current optional Google Analytics behavior without embedding a tracking ID in source.

## Bounded proof of concept

The proof is capped at **two developer days**. It must stop at the cap and report gaps rather than expanding into a parallel implementation. It does not receive production traffic, convert all content, implement every filter combination, or delete Play code.

### Proof scope

1. Run a raw HOCON inventory that reports unknown keys/values independently of the Scala models. Export a representative fixture through the existing models.
2. Pin Hugo and render the shared shell, home/list shells, local assets, and three projects: one simple, one with rich HTML/news/comments, and one with a mixed-case or spaced legacy path. Include representative help/sponsor and characteristic pages.
3. Build a small catalog fixture that demonstrates one search-plus-property query, one tag/technology query, one characteristic query, and random-selection invariants. Do not implement the complete interaction matrix.
4. Serve the proof through a Cloudflare Pages preview deployment and its production-equivalent configuration. Demonstrate exact no-trailing-slash query-shell routing, Pages `_redirects`, `404.html`, and representative encoded/title aliases. Explicitly record the arbitrary-case URL decision rather than masking it with server rewrites.
5. Produce a decision report with measured results, unresolved parity gaps, and a revised full-migration estimate.

### Proof acceptance evidence

- The raw inventory detects the four known unsupported characteristic assignments, records the current 16-issue baseline, and no source value disappears without a recorded decision.
- The three project slices render equivalent content; their canonical/detail/help/sponsor paths and selected explicit aliases return the expected 200/redirect behavior with no internal 404s. Unsupported aliases and unknown detail/help/sponsor paths return a generated 404. The report records the intentional arbitrary-case break.
- Representative query result sets equal Play fixtures; query context remains visible; random tests use a fixed seed and verify size, exclusion, and healthy-ratio invariants. A browser reload test injects a deterministic RNG and proves that JavaScript replaces the rendered no-JavaScript random fallback on every page load.
- Fixed-content screenshots at 1280 px and 375 px differ by at most 1% of pixels after masking analytics/dynamic regions, and manual review finds no content or layout regression.
- Automated accessibility checks add no critical or serious violations; keyboard-only search/filter flows retain visible focus and announce updated result counts.
- The proof records pinned Hugo/Node/tool versions and exact commands. After one warm-up, run each end-to-end static build (including its tests, with output directories cleaned and dependency caches retained) three times on the same machine; compare median wall time and peak RSS. Record the generated artifact bytes/file count and the Cloudflare Pages build/deployment result.
- The Cloudflare Pages configuration stays within the Free-plan static limits: 20,000 files, 25 MiB maximum per asset, and 500 builds per month; static asset requests remain free/unlimited because no Pages Function is invoked. Verify the project’s actual plan and current limits before cutover.
- To justify migration cost, the static candidate must reduce median build time and peak build RSS by at least 50%, remove the JVM/Kubernetes runtime workload, and introduce no new always-on service. These are decision thresholds, not production SLOs.

Passing the proof approves planning the full migration, not automatic deployment.

## Full migration slices after proof approval

1. **Canonical data conversion:** resolve every raw-data discrepancy, convert all 72 projects, add schema validation, and generate dated Play-oracle fixtures.
2. **Complete rendering and interactions:** generate all detail/help/sponsor and characteristic pages; implement the complete query/filter/random matrix; version the catalog and assets.
3. **Parity and Pages preview:** crawl the complete canonical/alias route manifest (including expected 404s), run contract/visual/accessibility checks plus reload-randomization checks, and deploy a Cloudflare Pages preview using the production configuration.
4. **Cutover and cleanup:** demonstrate rollback, switch traffic, observe errors, then remove Play/SBT/HOCON only after the agreed window.

Each slice remains reviewable and reversible; implementation tracking should be created only after the proof decision.

## Risks and mitigations

- **Client-side filtering weakens progressive enhancement and SEO.** Accept JavaScript as a migration constraint, pre-render the full list, preserve semantic forms, and retain Play if no-JavaScript query results are required.
- **Raw HOCON and rendered behavior already disagree.** Validate the raw tree before model conversion and explicitly resolve unsupported values instead of treating `None` as source truth.
- **Legacy URLs contain case, spaces, symbols, encoded/title aliases, and case-insensitive lookup.** Export canonical links and observed internal links, define the supported alias boundary, generate explicit Pages redirects, and test the complete manifest. The Free static path intentionally breaks arbitrary-case matching; a Function/Worker is out of scope unless separately approved.
- **Trusted HTML can be lost, escaped, or remain unsafe.** Preserve it explicitly during export, audit all rich fields, and allow raw rendering only for reviewed repository content.
- **Derived status logic can drift or freeze.** Keep raw dates canonical, inject the build timestamp, compare dated oracle fixtures, and rebuild nightly.
- **Search normalization can change behavior.** Current Play lowercases stored text but not the submitted term. Preserve that behavior during parity work or approve a separately tested mixed-case bug fix; do not change it accidentally.
- **Random behavior becomes non-deterministic in browser tests.** Seed tests and assert invariants rather than exact order.
- **HTML, JavaScript, and catalog caches can cross versions.** Fingerprint `catalog.json`, embed a schema version, publish each Pages deployment atomically, and test cache headers plus rollback compatibility.
- **Hugo content adapters are a newer feature.** Pin a tested Hugo version; prefer generated content files if adapter behavior complicates exact URLs.
- **A big-bang host change complicates diagnosis.** Use Cloudflare Pages preview deployments first, retain the Kubernetes/Play release as rollback, and cut over the custom domain only after parity evidence passes.
- **Maintaining two data sources causes drift.** Use HOCON only as the migration input and switch atomically to one canonical static format.

## Rollout and rollback

1. Keep the Kubernetes/Play branch and image releasable throughout the proof and migration.
2. Run the proof as a Cloudflare Pages preview deployment; it does not receive the production custom domain or require a production rollback rehearsal.
3. Before full-migration approval, document the custom-domain owner, exact DNS/origin records, TTL/cache expectations, and verification commands. Do not call the rollback “one-step” until this procedure is rehearsed.
4. After full-migration approval, publish the complete Hugo output through a separate Cloudflare Pages production deployment. Keep HTML, JavaScript, and the fingerprinted catalog in the same atomic Pages release.
5. Crawl preview canonical/alias routes and compare headers, statuses (including 404s), content, cache behavior, and Pages redirect behavior before traffic moves.
6. Rehearse the documented custom-domain cutover and restoration of the prior Kubernetes/Play service before production approval; record propagation timing and owner sign-off.
7. Monitor 404s, redirect loops, asset/catalog errors, client exceptions, key route availability, and Pages build/deployment status.
8. Remove Play/SBT/HOCON and the Kubernetes workload only after the agreed observation window; the conversion does not mutate external state.

## Decision and acceptance criteria

**Decision (2026-07-20):** the bounded proof was reviewed and closed with its failed/deferred gates documented. The owner then approved the staged full-migration backlog and canonical-data implementation. Production cutover remains gated on complete parity, Cloudflare Pages preview evidence, and rehearsed rollback.

After proof approval, the full migration is accepted only when:

1. All 72 projects and their detail/help/sponsor pages are generated from one canonical dataset.
2. The legacy route manifest records canonical encoded/title links, observed internal links, and the explicitly supported alias/case policy with no unexplained missing routes.
3. Search, tags, technologies, characteristics, property include/exclude filters, related filters, latest/new/updated/popular lists, and random-selection invariants match Play.
4. Fixed-fixture desktop/mobile visual diffs remain within the agreed 1% threshold; there are no new critical/serious accessibility violations and required keyboard flows pass.
5. The reproducible three-run benchmark meets or improves the proof's 50% decision thresholds, and Cloudflare Pages replaces the JVM/Kubernetes runtime without invoking Pages Functions. The randomized homepage boxes demonstrably refresh on each JavaScript-enabled reload, while the rendered fallback remains valid without JavaScript.
6. Contributor documentation covers one-command local preview, validation, and deployment.
7. The atomic Cloudflare Pages deployment, cache policy, catalog schema/version, documented custom-domain cutover/restoration procedure, and rollback to Play are rehearsed and tested.

If the proof fails exact URL or interaction parity, retain Play and limit modernization to dependency/runtime upgrades rather than building a custom generator.

## Decisions required before implementation

- Confirm that JavaScript-enabled query filtering is acceptable; otherwise retain Play.
- Treat homepage random boxes as changing on every page load when JavaScript is enabled; build-time selection is the no-JavaScript fallback.
- **Decided (2026-07-19):** use canonical URLs plus known encoded/title aliases. Intentionally return 404 for arbitrary-case detail/help/sponsor URLs, keeping the migration on free static Pages without a Function/Worker.
- **Decided (2026-07-20):** the proof report was reviewed, `dreamfactory-lu1` was closed, and the staged full-migration beads were approved.
