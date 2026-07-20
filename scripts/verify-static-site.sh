#!/usr/bin/env bash
set -euo pipefail

export DREAMFACTORY_AS_OF="${DREAMFACTORY_AS_OF:-2026-07-20T12:00:00Z}"

npm run test:static-data
scripts/build-static-site.sh

snapshot_hash() {
  sha256sum static-site/data/projects.json static-site/static/data/projects.json static-site/static/_redirects | sha256sum | cut -d' ' -f1
}

first_snapshot_hash="$(snapshot_hash)"
node scripts/generate-static-data.mjs >/tmp/dreamfactory-static-data-repeat.log
second_snapshot_hash="$(snapshot_hash)"
test "$first_snapshot_hash" = "$second_snapshot_hash"

jq -e '
  . as $catalog |
  .projectCount == 72 and
  ([.projects[].link] | length == ([.[]] | unique | length)) and
  (.home.noJavaScriptRandomProjects | length == 10) and
  ([.home.noJavaScriptRandomProjects[] | select(.link as $link | ($catalog.home.randomExcludedLinks | index($link)))] | length == 0) and
  ([.home.noJavaScriptRandomProjects[] | select((.derived.dead or .derived.unlikely or .derived.stale) | not)] | length >= 7)
' static-site/data/projects.json >/dev/null
jq -e '
  .schemaVersion == 1 and
  (.projects | length == 72) and
  ([.projects[].route | ascii_downcase] | length == ([.[]] | unique | length))
' static-site/source/projects.json >/dev/null

test -f static-site/public/404.html
test "$(find static-site/public/project -name index.html -not -path 'static-site/public/project/index.html' | wc -l)" -eq 216
test -f static-site/public/project/bad_usernames/index.html
test -f static-site/public/project/shop_grid/help/index.html
test -f static-site/public/projects/search/index.html
test -f static-site/public/projects/characteristic/type/complexity/characteristic/easy/index.html
test -f static-site/public/data/projects.json

grep -Fq '/project/Bad%20Usernames /project/bad_usernames 301' static-site/public/_redirects

grep -Fq 'random-projects.js' static-site/public/index.html
! grep -Fq 'href="/project/"' static-site/public/index.html
! grep -Fq 'href="/project/"' static-site/public/projects/index.html

grep -Fq 'catalog.js' static-site/public/projects/search/index.html
grep -Fq '<h3>News</h3>' static-site/public/project/gatehouse/index.html
grep -Fq '/project/Stuck%20%26amp%3B%20Duck/help' 'static-site/public/project/Stuck &amp; Duck/index.html'

scripts/verify-static-links.py

echo "Static-site proof artifacts verified."
