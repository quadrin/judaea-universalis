#!/bin/sh
# Run every headless sim suite (no browser, no server needed).
# Usage: sh tools/tests/run-smoke.sh
cd "$(dirname "$0")" || exit 1
fail=0
for f in $(ls smoke*.mjs | sort -V); do
  out=$(node "$f" 2>&1)
  last=$(printf '%s' "$out" | tail -1)
  echo "$f: $last"
  case "$last" in *"ALL PASS"*) ;; *) fail=1; printf '%s\n' "$out" | grep FAIL | head -5 ;; esac
done
exit $fail
