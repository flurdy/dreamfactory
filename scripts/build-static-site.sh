#!/usr/bin/env bash
set -euo pipefail

required_node_major="20"
installed_node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$installed_node_major" != "$required_node_major" ]]; then
  echo "Node $required_node_major is required; found ${installed_node_major:-none}." >&2
  exit 1
fi

required_hugo_version="0.164.0"
installed_hugo_version="$(hugo version | sed -n 's/.*v\([0-9][0-9.]*\).*/\1/p')"

if [[ "$installed_hugo_version" != "$required_hugo_version" ]]; then
  echo "Hugo $required_hugo_version is required; found ${installed_hugo_version:-none}." >&2
  exit 1
fi

node scripts/generate-static-data.mjs
rm -rf static-site/public
hugo --source static-site --destination public --minify --printPathWarnings
python3 scripts/generate-static-route-manifest.py
