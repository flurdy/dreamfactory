# Catalog data and compatibility

## Authored data

`static-site/source/projects/` is the only authored dataset: one project per
kebab-case JSON filename, validated by
[the schema](../static-site/schema/projects.schema.json) and
[the shared model](../scripts/lib/static-projects.mjs). Filenames organize files;
explicit `route` and `aliases` values define public identity. Never change routes
as a side effect of renaming a title or source file.

Preserve structured owners and keywords, ordered links, and reviewed rich HTML.
Raw HTML is trusted repository content, not an untrusted-input rendering API.
Reserve `news` for short site-wide announcements; put routine development notes
in `comments` and explanatory context in the description. Do not publish private
source links or imply unreleased/local functionality is deployed.

## Routes and browser behavior

- Preserve project detail, help and sponsor routes, canonical characteristic
  paths, and declared title/encoded aliases. Generate aliases and redirects from
  the same data and validate them with the route manifest.
- Arbitrary path casing is intentionally unsupported. Unknown project routes
  return 404; malformed tag/technology queries yield an empty 200 shell rather
  than the former application's 400 response. Generated forms use supported URLs.
- Render the complete project list without JavaScript. Search, tag/technology
  intersections and all eleven Include/Exclude property filters progressively
  enhance it; failed catalog fetches must retain the HTML fallback.
- Preserve form/query context, related facets, characteristic aliases, result
  counts, keyboard focus and accessibility announcements. Search lowercases
  stored title/description text but not the submitted term; changing that
  historical behavior requires an explicit, tested decision.
- Homepage Random reshuffles on each JavaScript-enabled load. Keep ten projects,
  at least seven healthy choices, and exclude the new/updated/popular selections.
  The no-JavaScript fallback is deterministic.
- Homepage and list summary URLs intentionally differ for abandoned projects:
  homepage source links remain active, while list links are marked not-live.
- Publish HTML, assets and the versioned catalog atomically. Fingerprint assets
  and catalog data; revalidate HTML. Keep assets vendored rather than adding
  runtime CDNs or edge functions without an architecture decision.

## Dates and deterministic output

Store raw dates, not derived status flags. Production derives status at build time
in UTC; tests inject `2026-07-20T12:00:00Z`. Keep partial authored-date precision:
a missing month/day means January/the first day for calculations. Three-year
recent and eight-year stale comparisons are strict; year subtraction clamps leap
days to the last valid day of February. Equal dates/frequencies use deterministic
route/name ordering rather than filesystem order.

## Historical regression evidence

The immutable files under [test/fixtures/static-site/](../test/fixtures/static-site/)
record the accepted July 2026 Play baseline, including a 47-case rendered query
matrix. Keep them even though the former runtime and migration reports are gone.
Old source, conversion decisions and benchmarks remain available in Git history.

Do not regenerate the fixtures to match current project content. Static-data
tests record explicit approved field changes; historical query tests use original
snapshots for refreshed entries and exclude later additions. Separate current
catalog/browser tests must cover new entries and changed filters, links and
release boundaries. Preserve old aliases while adding new routes.

See [operations](static-site-operations.md) for verification, deployment and
Pages-only rollback.
