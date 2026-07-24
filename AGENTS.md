# Dream Factory Agent Guide

Dream Factory is a Hugo static site for cataloging project ideas. Production is hosted on Cloudflare Pages at [code.flurdy.com](https://code.flurdy.com).

## Stack

- Hugo Extended `0.164.0`
- Node.js `22.22.2`
- Vanilla JavaScript and Bootstrap-compatible CSS
- Playwright and axe-core for browser/accessibility checks
- Docker Compose with nginx for production-shaped local verification
- Cloudflare Pages for deployment

The former Scala Play application and Kubernetes runtime were retired on 2026-07-24. They remain available only through Git history and dated migration fixtures.

## Repository structure

```text
dreamfactory/
├── static-site/
│   ├── source/projects.json       # Canonical authored project data
│   ├── schema/                    # Canonical JSON Schema
│   ├── content/                   # Hugo content adapters and page shells
│   ├── layouts/                   # Hugo templates and partials
│   ├── static/                    # Static assets and Pages headers
│   ├── hugo.toml                  # Hugo configuration
│   └── docker-compose.yml         # Local nginx preview
├── scripts/
│   ├── lib/static-projects.mjs    # Validation and derived catalog model
│   ├── build-static-site.sh       # Production build
│   └── verify-*                   # Artifact, route, browser, and Pages checks
├── test/
│   ├── static-site/               # Node contract tests
│   └── fixtures/static-site/      # Immutable migration baselines
├── docs/                          # Operations and migration evidence
├── .github/workflows/             # Scheduled Pages rebuild trigger
├── Makefile                       # Canonical local commands
└── package.json                   # Node scripts and pinned dependencies
```

## Canonical data

`static-site/source/projects.json` is the only authored project dataset. Do not edit generated files under:

- `static-site/data/`
- `static-site/static/data/`
- `static-site/public/`
- `static-site/static/_redirects`

Project routes are compatibility-sensitive. Preserve explicit `route` and `aliases` values unless a route migration is deliberately designed and verified. Follow `static-site/schema/projects.schema.json` and the decisions in `docs/static-data-migration-decisions.md`.

The Play-named fixtures under `test/fixtures/static-site/` are immutable historical contract evidence still consumed by Node tests. Do not delete or casually regenerate them.

## Development workflow

Install/select the pinned tools, then run:

```bash
nvm use
npm ci --ignore-scripts
make static-verify
```

Useful targets:

```bash
make static-build             # Generate data and build Hugo
make static-artifact-verify   # Determinism, schema, route, and link checks
make static-verify            # Complete browser/accessibility contract
make static-preview-up        # Serve at http://localhost:4176/
make static-preview-down
make static-route-contract
PAGES_PREVIEW_BASE_URL=https://<deployment>.dreamfactory.pages.dev make pages-preview-verify
```

Use Makefile targets for repeated/core operations. Do not add a second build path when an existing target can be extended.

## Implementation guidance

- Keep canonical validation in `scripts/lib/static-projects.mjs` and schema constraints in `static-site/schema/projects.schema.json`.
- Keep shared markup in Hugo partials rather than duplicating page-family templates.
- Preserve the complete no-JavaScript project list and progressively enhance it in browser code.
- Keep generated routes, aliases, redirects, and route-manifest checks synchronized.
- Preserve fingerprinted immutable assets and revalidated HTML cache behavior.
- Use vendored static assets; avoid adding runtime CDNs or Pages Functions without an explicit architecture decision.
- Use concise comments only where intent cannot be expressed through names or template structure.

## Deployment and operations

The Git-connected Cloudflare Pages project builds `master` with:

```text
npm ci && scripts/build-static-site.sh
```

Output is `static-site/public`. Production, preview verification, scheduled rebuilds, monitoring, and Pages-only rollback are documented in `docs/static-site-operations.md`.

Use immutable deployment URLs for acceptance evidence. Every production deployment, DNS mutation, rollback, and remote Git action requires fresh owner approval immediately before execution.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
