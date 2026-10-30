# Compatibility contracts

- **Identity:** `route` and `aliases` survive title/filename changes. Preserve
  detail/help/sponsor routes and declared encoded/title redirects.
- **Boundaries:** arbitrary path casing is unsupported; unknown projects return
  404. Malformed tag/technology queries produce an empty 200 shell, not a 400.
- **Fallback:** keep the complete HTML project list without JavaScript or when
  catalog loading fails. Filtering is progressive enhancement.
- **Search:** stored titles/descriptions are lowercased; submitted terms are not.
  Changing this historical behavior needs an explicit tested decision.
- **Random:** ten projects, at least seven healthy, excluding new/updated/popular
  selections. Reshuffle on JavaScript-enabled loads; deterministic HTML fallback.
- **Summary links:** abandoned-project source links remain active on the homepage
  but are marked not-live in the project list.
- **Dates:** UTC build time; fixed test clock `2026-07-20T12:00:00Z`. Missing month/day
  means January/first day. Keep strict three-year recent/eight-year stale comparisons,
  leap-day clamping and deterministic route/name tie-breaking.
- **Caching:** publish HTML/assets/catalog atomically; revalidate HTML and use
  immutable fingerprinted assets/catalog data. Assets stay vendored.
- **Content:** reviewed rich HTML is trusted, not an untrusted-input API. `news`
  is for short site-wide announcements; routine progress belongs in `comments`.
  Never publish private source links or describe local work as deployed.

## Historical tests

[test/fixtures/static-site/](../test/fixtures/static-site/) is immutable July 2026
Play evidence, including the 47-case query matrix. Do not regenerate it to match
current content. Static-data tests record approved field changes; the historical
matrix uses original snapshots for refreshed entries and excludes later additions.
Test current entries and changed filters/links/release boundaries separately.
