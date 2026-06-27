#!/usr/bin/env bash
# Symlink shared skills into project subdirectories.
#
#   ./link-skills.sh              # create/update symlinks
#   ./link-skills.sh --unlink     # remove symlinks only
#
# ── Config ───────────────────────────────────────────────────────────
# Groups of skills, then assign groups to projects.

SKILL_GROUPS=(
  "threejs threejs-fundamentals threejs-lighting threejs-loaders threejs-materials threejs-postprocessing threejs-textures threejs-shaders threejs-geometry threejs-animation threejs-interaction"
)

TARGET_PROJECTS=(
  "HexGL threejs"
  "HexConquest threejs"
  "Sol threejs"
)

SKILLS_SOURCE="."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$ROOT/$SKILLS_SOURCE/.agents/skills"

if [[ ! -d "$SKILLS_DIR" ]]; then
  echo "ERROR: $SKILLS_DIR does not exist — nothing to link from."
  exit 1
fi

# Resolve group names into space-separated skill list
resolve_skills() {
  local groups="$1"
  local result=""
  for g in $groups; do
    for gentry in "${SKILL_GROUPS[@]}"; do
      local gname gskills
      gname="${gentry%% *}"
      gskills="${gentry#* }"
      if [[ "$gname" == "$g" ]]; then
        result="$result $gskills"
      fi
    done
  done
  echo "$result"
}

link_one() {
  local project="$1" skill="$2"
  local target="$ROOT/$project/.agents/skills/$skill"
  local rel_path="../../../$SKILLS_SOURCE/.agents/skills/$skill"

  mkdir -p "$(dirname "$target")"

  if [[ -L "$target" ]]; then
    local current
    current="$(readlink "$target")"
    if [[ "$current" == "$rel_path" ]]; then
      echo "  ✓ linked:      $project/$skill"
    else
      ln -snf "$rel_path" "$target"
      echo "  ↻ updated:     $project/$skill"
    fi
  elif [[ -e "$target" ]]; then
    local backup="$target.bak.$(date +%s)"
    mv "$target" "$backup"
    ln -s "$rel_path" "$target"
    echo "  ⚠ replaced dir → symlink (backup: $backup): $project/$skill"
  else
    ln -s "$rel_path" "$target"
    echo "  → linked:      $project/$skill"
  fi
}

unlink_one() {
  local project="$1" skill="$2"
  local target="$ROOT/$project/.agents/skills/$skill"
  if [[ -L "$target" ]]; then
    rm "$target"
    echo "  removed symlink: $project/$skill"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--unlink" ]]; then
  echo "=== Unlinking ==="
else
  echo "=== Linking (source: $SKILLS_SOURCE) ==="
fi

for entry in "${TARGET_PROJECTS[@]}"; do
  project="${entry%% *}"
  group_list="${entry#* }"
  skills=$(resolve_skills "$group_list")
  for skill in $skills; do
    if [[ "${1:-}" == "--unlink" ]]; then
      unlink_one "$project" "$skill"
    else
      link_one "$project" "$skill"
    fi
  done
done
echo "Done."
