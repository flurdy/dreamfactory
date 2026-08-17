#!/usr/bin/env bash
set -euo pipefail

export DREAMFACTORY_AS_OF="${DREAMFACTORY_AS_OF:-2026-07-20T12:00:00Z}"

npm run test:static-data
npm run test:static-catalog
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
  .projectCount == (.projects | length) and
  ([.projects[].link] | length == ([.[]] | unique | length)) and
  (.home.noJavaScriptRandomProjects | length == 10) and
  ([.home.noJavaScriptRandomProjects[] | select(.link as $link | ($catalog.home.randomExcludedLinks | index($link)))] | length == 0) and
  ([.home.noJavaScriptRandomProjects[] | select((.derived.dead or .derived.unlikely or .derived.stale) | not)] | length >= 7)
' static-site/data/projects.json >/dev/null
project_count="$(jq -r '.projectCount' static-site/data/projects.json)"
test "$(find static-site/source/projects -maxdepth 1 -type f -name '*.json' | wc -l)" -eq "$project_count"

test -f static-site/public/404.html
test "$(find static-site/public/project -mindepth 1 -maxdepth 1 -type d -exec test -f '{}/index.html' \; -print | wc -l)" -eq "$project_count"
test "$(find static-site/public/project -mindepth 2 -maxdepth 2 -path '*/help' -type d -exec test -f '{}/index.html' \; -print | wc -l)" -eq "$project_count"
test "$(find static-site/public/project -mindepth 2 -maxdepth 2 -path '*/sponsor' -type d -exec test -f '{}/index.html' \; -print | wc -l)" -eq "$project_count"
test -f static-site/public/project/bad_usernames/index.html
test -f static-site/public/project/thoughtbox/index.html
test -f static-site/public/project/shop_grid/help/index.html
test -f static-site/public/project/shop_grid/sponsor/index.html
test -f static-site/public/projects/search/index.html
test "$(find static-site/public/projects/characteristic -name index.html | wc -l)" -eq 38
test -f static-site/public/projects/characteristic/type/complexity/characteristic/easy/index.html
test -f static-site/public/projects/characteristic/type/complexity/characteristic/hard/index.html
test -f static-site/public/projects/characteristic/type/status.development/characteristic/mothballed/index.html
test -f static-site/public/data/projects.json

grep -Fq '/project/Bad%20Usernames /project/bad_usernames 301' static-site/public/_redirects

grep -Eq 'random-projects\.[a-f0-9]+\.js' static-site/public/index.html
grep -Eq 'shell\.[a-f0-9]+\.js' static-site/public/index.html
! grep -Fq 'src=/assets/javascript/shell.js' static-site/public/index.html
! grep -Fq 'href="/project/"' static-site/public/index.html
! grep -Fq 'href="/project/"' static-site/public/projects/index.html

grep -Eq 'catalog\.[a-f0-9]+\.js' static-site/public/projects/search/index.html
grep -Fq '<h2>News</h2>' static-site/public/project/gatehouse/index.html
grep -Fq 'Help or Join' static-site/public/project/gatehouse/help/index.html
grep -Fq 'paypal-form' static-site/public/project/gatehouse/sponsor/index.html
grep -Fq 'Send a message' static-site/public/project/gatehouse/sponsor/index.html
grep -Fq '/project/Stuck%20%26amp%3B%20Duck/help' 'static-site/public/project/Stuck &amp; Duck/index.html'

scripts/verify-static-links.py

echo "Static-site proof artifacts verified."
