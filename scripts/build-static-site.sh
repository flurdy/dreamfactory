#!/usr/bin/env bash
set -euo pipefail

required_hugo_version="0.164.0"
installed_hugo_version="$(hugo version | sed -n 's/.*v\([0-9][0-9.]*\).*/\1/p')"

if [[ "$installed_hugo_version" != "$required_hugo_version" ]]; then
  echo "Hugo $required_hugo_version is required; found ${installed_hugo_version:-none}." >&2
  exit 1
fi

sbt "runMain tools.StaticSiteExport"
rm -rf static-site/public
hugo --source static-site --destination public --minify --printPathWarnings
