#!/bin/sh
# Run every Playwright browser suite. Requires:
#   1. the game served at http://127.0.0.1:8613  (python3 -m http.server 8613 --directory .)
#   2. playwright resolvable: set JU_PW_DIR to a directory whose node_modules
#      contains playwright (npm i playwright), and a chromium at /opt/pw-browsers
#      (or edit the executablePath in the suites).
# Usage: JU_PW_DIR=/path/to/dir sh tools/tests/run-ui.sh
cd "$(dirname "$0")" || exit 1
fail=0
for f in $(ls uitest*.mjs | sort -V); do
  out=$(node "$f" 2>&1)
  last=$(printf '%s' "$out" | tail -1)
  echo "$f: $last"
  case "$last" in *"ALL PASS"*) ;; *) fail=1; printf '%s\n' "$out" | grep FAIL | head -5 ;; esac
done
exit $fail
