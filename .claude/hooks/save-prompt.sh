#!/usr/bin/env bash
# UserPromptSubmit hook — appends every user prompt verbatim to PROMPTS.md.
# Powers the 25% "prompting craft" grade for the SR&ED coder challenge.
set -euo pipefail

PROMPTS_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/PROMPTS.md"

# Read JSON payload from stdin
payload="$(cat)"

# Extract the prompt field. Prefer jq if available, fall back to python.
if command -v jq >/dev/null 2>&1; then
  prompt="$(printf '%s' "$payload" | jq -r '.prompt // empty')"
else
  prompt="$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("prompt",""))')"
fi

# Skip empty prompts
if [ -z "$prompt" ]; then
  exit 0
fi

# Initialize the file if missing
if [ ! -f "$PROMPTS_FILE" ]; then
  cat > "$PROMPTS_FILE" <<'INIT'
# Prompts

This file is the record of how Claude Code was directed during the SR&ED Manager build.
The raw log below is auto-appended by a UserPromptSubmit hook. The curated highlights
section is maintained by the `prompts-curator` agent and is what we'll discuss Wednesday.

## Curated highlights

_(populated by `prompts-curator` agent at milestone points)_

## Raw log

INIT
fi

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  printf '\n### %s\n' "$timestamp"
  printf '%s\n' "$prompt"
} >> "$PROMPTS_FILE"

# Don't block the prompt
exit 0
