#!/usr/bin/env bash
# Regenerate CHANGELOG.md from the project's tag history (Keep a
# Changelog format, with an Unreleased section at the top).
#
# Walks every `v*` tag in chronological order, emitting one section per
# release with the conventional-commit subjects in that release's
# range. Run by the release workflow with the just-pushed tag as
# argument; can also be run manually with any tag to regenerate.
set -euo pipefail

tag="${1:?usage: generate-changelog.sh <tag>}"

mapfile -t tags < <(git tag --sort=creatordate --list 'v*')

# Ensure the tag we were given is in the list (the release workflow
# pushes the tag before this script runs, so it should already be).
in_list=0
for t in "${tags[@]}"; do
  [ "$t" = "$tag" ] && in_list=1 && break
done
if [ "$in_list" -eq 0 ]; then
  tags+=("$tag")
fi

{
  echo "# Changelog"
  echo
  echo "All notable changes to this project are documented here. The format is"
  echo "based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and"
  echo "this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)."
  echo
  echo "The \`Unreleased\` section is regenerated automatically by the release"
  echo "workflow from the conventional-commit stream — do not hand-edit"
  echo "released sections."
  echo
  echo "## [Unreleased]"
  echo

  # Emit each release in reverse chronological order (newest first).
  prev=""
  for t in "${tags[@]}"; do
    : "$prev"
  done
  # Walk the array in reverse, tracking the predecessor tag for `range`.
  for ((i = ${#tags[@]} - 1; i >= 0; i--)); do
    t="${tags[i]}"
    if [ "$i" -gt 0 ]; then
      prev="${tags[i - 1]}"
      range="${prev}..${t}"
    else
      range="$t"
    fi
    echo "## [${t#v}]"
    echo
    git log --pretty=format:'- %s' "$range" | sort -u
    echo
  done
} > CHANGELOG.md
