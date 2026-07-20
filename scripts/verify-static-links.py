#!/usr/bin/env python3
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

root = Path("static-site/public")
redirect_sources = {
    line.split()[0]
    for line in (root / "_redirects").read_text().splitlines()
    if line.strip() and not line.startswith("#")
}

found_source_defects = set()
broken_internal = set()

for html_file in root.rglob("*.html"):
    content = html_file.read_text(errors="replace")
    for match in re.finditer(r'''href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))''', content):
        raw_href = next(group for group in match.groups() if group is not None)
        href = unescape(raw_href)
        if href.startswith("@routes") or re.match(r"https?:/(?!/)", href):
            found_source_defects.add(href)
            continue
        if not href.startswith("/") or href.startswith("//"):
            continue
        path = urlsplit(href).path
        decoded_path = unquote(path)
        direct = root / decoded_path.lstrip("/")
        candidates = [direct, direct / "index.html"]
        if decoded_path == "/":
            candidates.append(root / "index.html")
        encoded_source = path.rstrip("/") or "/"
        if not any(candidate.is_file() for candidate in candidates) and encoded_source not in redirect_sources:
            broken_internal.add(f"{html_file.relative_to(root)} -> {href}")

if broken_internal or found_source_defects:
    if broken_internal:
        print("Broken internal routes:")
        print("\n".join(sorted(broken_internal)))
    if found_source_defects:
        print("Source-link defects:")
        print("\n".join(sorted(found_source_defects)))
    raise SystemExit(1)

print("Static link audit passed with no source-link defects.")
