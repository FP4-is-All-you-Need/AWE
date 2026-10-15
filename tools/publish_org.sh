#!/usr/bin/env bash
# Publish only after the release tree has been reviewed and approved.
set -euo pipefail
if [[ ${1:-} != --publish || $# != 1 ]]; then
  echo 'Usage: AWE_PUBLISH_TREE=<approved-full-tree-id> tools/publish_org.sh --publish' >&2
  exit 2
fi
: "${AWE_PUBLISH_TREE:?Set the approved full Git tree ID}"
[[ $AWE_PUBLISH_TREE =~ ^[0-9a-f]{40}$ ]] || { echo 'Use a full Git tree ID' >&2; exit 1; }
: "${AWE_PUBLISH_NAME:=AWE authors}"
: "${AWE_PUBLISH_EMAIL:=awe@users.noreply.github.com}"
for command in git gh npm python3 tar nice taskset; do command -v "$command" >/dev/null; done
release_root=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
[[ $(git -C "$release_root" branch --show-current) == release-org ]] || { echo 'Check out release-org first' >&2; exit 1; }
[[ -z $(git -C "$release_root" status --porcelain) ]] || { echo 'Commit the release tree first' >&2; exit 1; }
release_commit=$(git -C "$release_root" rev-parse HEAD)
release_tree=$(git -C "$release_root" rev-parse "$release_commit^{tree}")
[[ $release_tree == "$AWE_PUBLISH_TREE" ]] || { echo 'Release tree differs from the approved tree' >&2; exit 1; }
destination=FP4-is-All-you-Need/AWE
# Authentication and destination checks do not change GitHub state.
gh auth status --hostname github.com
if gh repo view "$destination" >/dev/null 2>&1; then echo 'Destination already exists; refusing to replace it' >&2; exit 1; fi
publish_dir=$(mktemp -d "${TMPDIR:-/tmp}/awe-publish.XXXXXXXX")
trap 'echo "Publication files retained at $publish_dir" >&2' EXIT
source_dir="$publish_dir/source"
site_dir="$publish_dir/site"
mkdir "$source_dir" "$site_dir"
git -C "$release_root" archive "$release_commit" | tar -x -C "$source_dir"
# A new repository: no personal branches, tags, remotes, history or Git config.
git -C "$source_dir" init --initial-branch=main
git -C "$source_dir" config user.name "$AWE_PUBLISH_NAME"
git -C "$source_dir" config user.email "$AWE_PUBLISH_EMAIL"
git -C "$source_dir" add .
git -C "$source_dir" -c commit.gpgsign=false commit -m 'AWE: constructions, verification and interactive catalog'
[[ $(git -C "$source_dir" rev-list --count HEAD) == 1 ]]
[[ $(git -C "$source_dir" rev-parse HEAD^{tree}) == "$release_tree" ]]
# Limit this build to one available CPU, at reduced priority.
publish_cpu=$(python3 -c 'import os; print(min(os.sched_getaffinity(0)))')
nice -n 10 taskset -c "$publish_cpu" npm --prefix "$source_dir/site" ci
nice -n 10 taskset -c "$publish_cpu" npm --prefix "$source_dir/site" run build:pages
cp -a "$source_dir/site/dist/." "$site_dir/"
touch "$site_dir/.nojekyll"
python3 - "$source_dir" "$site_dir" <<'PY'
import json, pathlib, subprocess, sys
source, site = map(pathlib.Path, sys.argv[1:])
paths = [source / n for n in subprocess.check_output(['git','-C',str(source),'ls-files','-z']).decode().split('\0') if n]
for name, files in [('source',paths),('site',[p for p in site.rglob('*') if p.is_file()])]:
    size = sum(p.stat().st_size for p in files)
    assert size < 1_000_000_000, (name, 'over 1 GB')
    assert all(p.stat().st_size < 100_000_000 for p in files), (name, 'file over 100 MB')
    print(json.dumps({'tree':name,'files':len(files),'bytes':size,'largest_bytes':max(p.stat().st_size for p in files)}))
assert not (source/'.github/workflows').exists(), 'No workflow is used'
PY
git -C "$site_dir" init --initial-branch=gh-pages
git -C "$site_dir" config user.name "$AWE_PUBLISH_NAME"
git -C "$site_dir" config user.email "$AWE_PUBLISH_EMAIL"
git -C "$site_dir" add .
git -C "$site_dir" -c commit.gpgsign=false commit -m 'Publish the AWE static catalog'
[[ $(git -C "$site_dir" rev-list --count HEAD) == 1 ]]
# Only the following commands create the repository or publish content.
gh repo create "$destination" --public --description 'AWE: exact integer matrix products with FP4' --disable-wiki
git -C "$source_dir" remote add origin "https://github.com/$destination.git"
git -C "$source_dir" -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin main
git -C "$site_dir" -c credential.helper= -c 'credential.helper=!gh auth git-credential' push "https://github.com/$destination.git" gh-pages
if gh api "repos/$destination/pages" >/dev/null; then
  pages_method=PUT
else
  pages_method=POST
fi
gh api --method "$pages_method" "repos/$destination/pages" -f build_type=legacy -f 'source[branch]=gh-pages' -f 'source[path]=/'
echo 'Published source and site: https://fp4-is-all-you-need.github.io/AWE/'
