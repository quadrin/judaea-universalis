# SECOND TEMPLE JUDAEA — SPEC (draft)

Scope: the Second Temple period, 516 BCE – 70 CE. This document becomes the authoritative
contract once the first vertical slice is defined; until then it is a working outline.

## Candidate bookmarks

- **The Return, 538 BCE** — Yehud under Persia; rebuilding against Samaritan opposition.
- **Alexander at the Gates, 332 BCE** — the Persian order collapses.
- **The Fifth Syrian War, 202 BCE** — Judaea passes from Ptolemy to Antiochus.
- **The Maccabean Revolt, 167 BCE** — covered by Judaea Universalis; possible shared data.
- **Herod's Kingdom, 20 BCE** — the Temple rebuilt in splendor; client-king politics.
- **The Great Revolt, 66 CE** — covered by Judaea Universalis; possible shared data.

## Hard rules (inherited from Judaea Universalis)

- Plain ES modules, browser-native, zero dependencies, no build step.
- Served by `python3 -m http.server` from the repo root. Target latest Chrome.
- Sim and data modules are DOM-free.
- Fail soft: unknown name → `console.warn` once, skip; never throw in a loop.
