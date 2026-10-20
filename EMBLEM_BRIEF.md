# Court standards — Judaea Universalis

Court banners should carry the visual character of the people, objects and
art traditions they reference. Preserve internal drawing detail, anatomy,
construction, feathering, inscriptions and material ornament where they help
identify the subject. The earlier silhouette-only direction is superseded.

## Artwork

`js/ui/flag_art.js` supplies the established renderer contract and fields.
`js/ui/court_standards.js` replaces 101 of the generic devices with original
coin-, relief-, architecture- and object-inspired drawings. The enrichment
runs after the base assignments, before `FLAGS` receives the final artwork.
The remaining explicit art, modern flags and identity lookups remain supported.
`js/ui/standard_figures.js` supplies 15 refined figure drawings on a 192-unit
grid, scaled into the established 96-unit viewBox. These preserve anatomy,
metalwork, garment folds and feathering in the same master at every size.

Each standard supplies `{viewBox, flatBanner, fieldColor, emblem, note, body}`.
The richer entries also supply `detailed` and an optional `[label, URL]` source.
Keep the complete SVG drawing at every size. Do not remove details, rasterize
masters, truncate path precision or substitute a generic glyph for small chips.
SVG provides scalable source art; a larger viewBox alone adds no detail.

The app uses 14–34px chips where space is constrained. The Nations roster uses
52px standards; each nation page displays the same source at 160px with its
motif note. `tools/flags.html` shows 160px previews alongside 14/24/34/52px
samples. Inspect both the full drawing and the actual game sizes.

Keep one coherent composition, clear margins and a recognisable principal
subject. Use secondary elements when they communicate a specific association
(the gorytos with the Scythian bow, attendants at the Sasanian altar, chains on
a votive crown). Internal outlines, incised lines, faces, feathering, multiple
inks and object ornament are supported. Arbitrary decoration cannot substitute
for a court-specific subject. Keep art self-contained, with no scripts,
external assets, raster images or filters. Modern national flag layouts retain
their established colours, geometry and runtime era variants.

## Historical interpretation

These are original game standards. The palette, composition and attribution
of an object to a court are design decisions. A coin, architectural feature or
piece of jewellery documents a motif; it does not demonstrate that anyone flew
this exact flag. Label regional analogies and invented tribal assignments.

Several courts span centuries. Notes identify retrospective references, such
as Aksum's later surviving stelae, Meroitic royal cemeteries, Pictish symbol
stones and later Visigothic votive crowns. Do not describe these objects as
contemporary evidence for the earliest chapter. The IYI mark's specific
meaning and dynastic attribution are uncertain. Do not present the Iron
Crown's disputed early history as settled. Epigraphic texture on the Moabite
stele is explicitly inscription-like drawing, not a fabricated transcription.

The ancient Israel altar, Judaean menorah, Hasmonean cornucopias, gold Magen
David of the alternative Kingdom of Israel, and modern Israeli flag preserve
their distinct identities. Runtime rebrands and chapter overrides must resolve
notes and images through the same lookup (`flagInfo` and `flagChip`).

## Checked reference objects

Sources support the stated motif only. All drawings are original; no museum
photographs are embedded. The source map in `court_standards.js` also appears
in the development gallery and the relevant nation's Compendium page.

- Tyre: [Mariners’ Museum, CL3826](https://catalogs.marinersmuseum.org/object/CL3826), murex shells and purple production.
- Etruria: [Met, terracotta antefix](https://www.metmuseum.org/art/collection/search/252929), terracotta Medusa antefix.
- Corinth: [Cleveland Museum of Art, 1916.984](https://www.clevelandart.org/art/1916.984), Pegasus flying left on a Corinthian stater.
- Cyrene: [British Museum, EH,p697.3.Cyr](https://www.britishmuseum.org/collection/object/C_EH-p697-3-Cyr), silphium coin.
- Tarentum: [British Museum, EH,p87.24.Tar](https://www.britishmuseum.org/collection/object/C_EH-p87-24-Tar), dolphin rider with trident.
- Lydia: [British Museum, 1877,0201.1](https://www.britishmuseum.org/collection/object/C_1877-0201-1), facing lion and bull.
- Sequani regional comparison: [National Museums Scotland, X.1992.25](https://www.nms.ac.uk/explore-our-collections/collection-search-results/?item_id=384359), Deskford carnyx reconstruction. This Scottish object supplies a regional comparison, not a Sequani attribution.
- Elam: [Encyclopaedia Iranica, Kurangun](https://www.iranicaonline.org/articles/kurangun/), snake-throne imagery.
- Bactria: [British Museum, IOLC.515](https://www.britishmuseum.org/collection/object/C_IOLC-515), elephant head coin. The banner expands the head motif into an invented complete animal composition.
- Kush: [UNESCO, Meroe](https://whc.unesco.org/en/list/1336/), royal cemeteries and pyramids.
- Aksum: [UNESCO, Aksum](https://whc.unesco.org/en/list/15/), monumental stelae.
- Sardinia: [Met, Nuragic sculpture](https://www.metmuseum.org/ja/essays/sardinian-giants), stone towers and tower models.

- Dacia: [National History Museum of Romania](https://www.mnir.ro/sectiunea-terra-dacorum/eu-basileul/), draco on Trajan’s Column and related gold ornaments.
- Tabal: [UNESCO, Ivriz Cultural Landscape](https://whc.unesco.org/fr/listesindicatives/6244/), the weather god’s wheat and grapes.
- Saba regional comparison: [Met, standing bull](https://www.metmuseum.org/art/collection/search/328941), South Arabian bull sculpture.
- Pergamon: [Berlin Münzkabinett, 18204058](https://ikmk.smb.museum/object?id=18204058&lang=en), cista mystica and serpent.
- Syracuse: [British Museum, 1946,0101.1403](https://www.britishmuseum.org/collection/object/C_1946-0101-1403), Arethusa surrounded by four dolphins.
- Ostrogoths: [Met, 95.15.100a](https://www.metmuseum.org/art/collection/search/468991), silver and garnet eagle buckle from Crimea, dated 500–700.
- Gepid regional comparison: [Walters, 54.423](https://art.thewalters.org/object/54.423/), Visigothic eagle fibula. The object is Visigothic; its assignment as a Gepid game device is invented.
- Sasanian Persia: [British Museum, 1930,0708.4](https://www.britishmuseum.org/collection/object/C_1930-0708-4), fire altar with diadem ties and two staff-bearing attendants.
- Himyar: [Paul Yule, Late Himyarite Vulture Reliefs](https://archiv.ub.uni-heidelberg.de/propylaeumdok/111/1/Yule_Eagle2005.pdf), later Zafar bird-of-prey reliefs. This is a retrospective motif; the crown and crescent are game additions.

## Review and compatibility

Run `node tools/tests/smoke213.mjs` and `node tools/tests/smoke186.mjs` for
coverage of all 210 catalog/revival courts, formations, chapter overrides,
borrowed-flag saves, runtime rebrands and synthetic old-save courts.
`node tools/tests/smoke215.mjs` checks retained SVG detail, distinct drawings,
sources and identity-aware notes.
`uitest72.mjs` checks the complete SVG gallery, bounds, real chip sizes,
Compendium display, start-screen identities, Court headers and mobile layout.

Inspect the entire roster. Compare courts that appear together, especially
related ships, bows, crowns, forts and torcs. Check recognisability, overlap,
clipping, contrast and retained internal detail. Keep the historical note
accurate when the subject changes.
