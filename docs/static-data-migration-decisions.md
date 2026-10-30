# Static project data migration decisions

**Decision date:** 2026-07-20

`static-site/source/projects/` is the canonical authored dataset, with one JSON object per project file. Every project has an explicit `route`; corrected titles, encoded values, filenames, and aliases must not change that route implicitly.

## Raw HOCON discrepancy decisions

| Source | Field | Previous value | Canonical decision |
|---|---|---|---|
| Bad Usernames, Gauge | `characteristics.appeal` | `high` | `keen` |
| Consensus | `characteristics.appeal` | `somewhat` | `maybe` |
| Baby Crowd Monitor, Bookmarks, Grapemine | development status | `not started` | `notstarted` |
| Guvnor | complexity | `very high` | `verydifficult` |
| Problems | `comlexity` | `low` | Correct field name; `complexity=easy` after model normalization |
| Scala Soup, Spring Boot Logging JSON | `encode` | legacy slug | Preserve current title route; retain value as an explicit alias |
| Expire | `keywords` | comma-separated string | Preserve as a structured keyword list |
| Letterbox, Lucid, TapIn, Tulipan | `owner` | structured owner | Preserve as structured owner metadata |
| Shop Mobile | release status | `abandoned` | `mothballed` |

The raw inventory reports no unresolved fields or values after these decisions.

## Existing content defects

- Replaced stale `@routes.ProjectController.ideas()` fragments with `/projects/?filter.idea=require`.
- Corrected four `https:/github.com/...` links to `https://github.com/...`.

## Later catalog updates

The 2026-10-30 catalog refresh records PillTrack as an implemented alpha with an
iPhone support page rather than an unstarted idea. Bad Usernames remains API-focused: its Apache-2.0 service wraps the
separate MIT-licensed JSON dataset. Thoughtbox and Wrap gained progress updates;
Baton was added without a private source link or a public-release claim. Foyer's
private hosted status was reviewed and retained.

The immutable Play fixtures still describe July 2026. Static-data tests retain
explicit approved field changes for refreshed historical entries; the 47-case query
matrix uses those entries' original snapshots. Separate current-catalog tests cover
their changed filters, links and release boundaries. Do not regenerate the fixtures
to match new project content.

## Behavior boundaries

- Generated derived state uses an explicit instant and UTC. Production defaults to the build instant; tests use `2026-07-20T12:00:00Z`.
- Partial authored dates retain their original precision. Derivation interprets missing month/day components as January/first day, matching the existing Joda behavior used by Play.
- Three-year recent and eight-year stale comparisons remain strict; leap-day year subtraction clamps to the final valid day of February.
- The fixed-clock Play oracle is under `test/fixtures/static-site/play-oracle-2026-07-20/`. It was generated from the pre-migration HOCON at the recorded instant in UTC.
- Equal-date and equal-frequency homepage ties now use deterministic route/name ordering instead of filesystem/Scala collection iteration order.
- Homepage and projects-list summary URLs intentionally differ in Play. Generated projects carry both behaviors: homepage source URLs remain active, while list-page abandoned-project URLs are marked not-live.
