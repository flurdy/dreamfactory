#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path("static-site/public")
MANIFEST = ROOT / "route-manifest.json"


def route_for(file: Path) -> str:
    relative = file.relative_to(ROOT)
    if relative.name == "index.html":
        parent = relative.parent.as_posix()
        return "/" if parent == "." else f"/{quote(parent, safe='/')}"
    return f"/{quote(relative.as_posix(), safe='/')}"


def category(route: str) -> str:
    if route == "/":
        return "home"
    if route.startswith("/project/"):
        if route.endswith("/help/"):
            return "help"
        if route.endswith("/sponsor/"):
            return "sponsor"
        return "project"
    if route.startswith("/projects/characteristic/"):
        return "characteristic"
    if route in {"/projects/search/", "/projects/tag/", "/projects/tags/", "/projects/tech/", "/projects/technologies/"}:
        return "query-shell"
    if route == "/projects/":
        return "catalog"
    if route.startswith("/assets/"):
        return "asset"
    return "other"


def redirect_entries() -> list[dict[str, str | int]]:
    entries = []
    for line in (ROOT / "_redirects").read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        source, target, status, *_ = line.split()
        entries.append({"from": source, "to": target, "status": int(status)})
    return entries


def main() -> None:
    if not ROOT.is_dir():
        raise SystemExit(f"Missing generated site at {ROOT}")

    routes = sorted(
        {
            route_for(file)
            for file in ROOT.rglob("*")
            if file.is_file() and file.name not in {"404.html", "_redirects", "route-manifest.json"}
        }
    )
    canonical = set(routes)
    redirects = redirect_entries()
    sources = [entry["from"] for entry in redirects]

    if len(routes) != len(canonical):
        raise SystemExit("Duplicate canonical routes")
    if len(sources) != len(set(sources)):
        raise SystemExit("Duplicate redirect sources")
    collisions = canonical.intersection(sources)
    if collisions:
        raise SystemExit(f"Redirect sources collide with canonical routes: {sorted(collisions)}")
    unknown_targets = sorted({entry["to"] for entry in redirects}.difference(canonical))
    if unknown_targets:
        raise SystemExit(f"Redirect targets are not canonical routes: {unknown_targets}")

    manifest = {
        "schemaVersion": 1,
        "canonicalRoutes": [{"path": route, "category": category(route)} for route in routes],
        "redirects": redirects,
        "expectedNotFound": ["/project/DOES-NOT-EXIST", "/project/Gatehouse"],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        "Route manifest verified: "
        f"{len(routes)} canonical routes, {len(redirects)} redirects, "
        f"{len(manifest['expectedNotFound'])} expected 404s."
    )


if __name__ == "__main__":
    main()
