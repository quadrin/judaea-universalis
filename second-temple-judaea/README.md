# Second Temple Judaea

A companion project to [Judaea Universalis](https://github.com/quadrin/judaea-universalis),
focused on the Second Temple period: from the return under Cyrus and the rebuilding of the
Temple (516 BCE) to its destruction by Titus (70 CE).

Where Judaea Universalis is a grand-strategy game spanning bookmarks from the Maccabees to
1948, this project narrows to the six centuries of the Second Temple itself — Persian Yehud,
the coming of Alexander, the Ptolemaic and Seleucid tug-of-war, the Hasmonean kingdom,
Herod, and Roman Judaea.

Same house rules as the parent project: browser ES modules, WebGL where it earns its keep,
**zero dependencies, no build step**.

## Run

```sh
python3 -m http.server 8614 --directory .
# open http://localhost:8614
```

## Status

Freshly scaffolded. The landing page (`index.html`) and module skeleton (`main.js`,
`js/core/`) are in place; the design document lives in `SPEC.md` as it firms up.

## Repository layout

```
index.html      entry point
styles.css      global styles
main.js         boot module
js/core/        bus, rng — shared plumbing (DOM-free)
SPEC.md         design contract (authoritative once written)
```
