#!/usr/bin/env python3
"""Build portable offline HTML and ZIP using Python 3.10+ (standard library only).

Native ES modules load through an import map of embedded data URLs. The build
rewrites relative static imports to stable map keys. No network is used.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import mimetypes
from pathlib import Path
import posixpath
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NAME = 'Judaea-Universalis-Offline'
BINDINGS = r'(?:[\w$]+\s*,\s*)?(?:\{[^}]*\}|\*\s+as\s+[\w$]+)|[\w$]+'
STATIC_IMPORT = re.compile(
    r'''(?m)^(?P<head>[ \t]*(?:import\s+(?:(?:''' + BINDINGS + r''')\s+from\s+)?|export\s+(?:\{[^}]*\}|\*)\s+from\s+))(?P<quote>['"])(?P<spec>[^'"\r\n]+)(?P=quote)'''
)
CSP = ("default-src 'none'; script-src 'unsafe-inline' data:; "
       "style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; "
       "font-src data:; connect-src 'none'; base-uri 'none'; object-src 'none'")
README = '''Judaea Universalis — offline single-player

1. Extract this ZIP.
2. Open Judaea-Universalis-Offline.html in a current Chrome or Edge browser.
3. Choose a chapter and nation, then play. Wi-Fi and a local server are unnecessary.

All game code, maps, artwork and synthesized sound live inside the HTML.
Cloud saves and multiplayer are disabled. External source links need internet.

Saves live in this browser. Keep the HTML at the same path. Under Saved
campaigns, Download creates a JSON backup and Import save file restores one.
Export saves before moving the HTML, switching browsers, or clearing browser data.
Campaigns exported from the website can also be imported here.

Source: https://github.com/quadrin/judaea-universalis
Play online: https://quadrin.github.io/judaea-universalis/
Rebuild: python3 tools/build_offline.py (Python 3.10+, no dependencies)
'''

def module_path(parent: str, spec: str) -> str:
    if not spec.startswith(('./', '../')):
        raise ValueError(f'Unsupported module in {parent}: {spec}')
    path = posixpath.normpath(posixpath.join(posixpath.dirname(parent), spec))
    if path.startswith('../') or not path.endswith('.js'):
        raise ValueError(f'Module escapes project or is not JavaScript: {path}')
    return path


def build(output: Path, archive: Path) -> dict:
    sources: dict[str, str] = {}
    def visit(path: str) -> None:
        if path in sources:
            return
        source = (ROOT / path).read_text(encoding='utf-8')
        code_lines = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('//'))
        if re.search(r'\bimport\s*\(|\bimport\.meta\b', code_lines):
            raise ValueError(f'Dynamic imports/import.meta need build support: {path}')
        sources[path] = source
        for match in STATIC_IMPORT.finditer(source):
            visit(module_path(path, match['spec']))
    visit('main.js')
    imports = {}
    for path, source in sorted(sources.items()):
        def replace(match: re.Match) -> str:
            key = 'ju/' + module_path(path, match['spec'])
            return match['head'] + match['quote'] + key + match['quote']
        source = STATIC_IMPORT.sub(replace, source)
        imports['ju/' + path] = 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    if '@import' in css or re.search(r'url\s*\(', css, re.I):
        raise ValueError('CSS contains an asset that needs explicit embedding')
    def asset_uri(path: str) -> str:
        mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        return 'data:' + mime + ';base64,' + base64.b64encode((ROOT / path).read_bytes()).decode()
    assets = {'titleLogo': asset_uri('icons/judaea-universalis-logo.webp')}
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    # Favicons also stay local when this document is opened directly from disk.
    html = re.sub(r'href="(icons/[^"]+)"', lambda m: 'href="' + asset_uri(m[1]) + '"', html)
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + CSP + '">', 1)
    html = re.sub(r'<link\b[^>]*rel="(?:manifest|apple-touch-icon)"[^>]*>\s*', '', html)
    css = re.sub(r'</style', r'<\\/style', css, flags=re.I)
    html, styles = re.subn(r'<link rel="stylesheet" href="styles.css">', lambda _: '<style>\n' + css + '\n</style>', html)
    modules = '<script>globalThis.__JU_OFFLINE__ = true;globalThis.__JU_ASSETS__=' + json.dumps(assets, separators=(',', ':')) + ';</script>\n'
    modules += '<script type="importmap">' + json.dumps({'imports': imports}, separators=(',', ':')) + '</script>\n'
    modules += '<script type="module">import "ju/main.js";</script>'
    html, scripts = re.subn(r'<script type="module" src="main.js"></script>', lambda _: modules, html)
    if styles != 1 or scripts != 1:
        raise ValueError('index.html entry points changed; update the offline build')
    if '<title>Judaea Universalis</title>' not in html:
        raise ValueError('Unexpected game title')
    output.mkdir(parents=True, exist_ok=True)
    data = html.encode('utf-8')
    (output / (NAME + '.html')).write_bytes(data)
    archive.parent.mkdir(parents=True, exist_ok=True)
    (archive.parent / (NAME + '.html')).write_bytes(data)
    # Fixed timestamps and sorted names keep repeated builds byte-identical.
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, payload in sorted({NAME + '.html': data, 'READ-ME.txt': README.encode()}.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, payload, compresslevel=9)
    return {'modules': len(sources), 'html_bytes': len(data), 'zip_bytes': archive.stat().st_size,
            'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'archive': str(archive)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    parser.add_argument('--archive', type=Path, default=ROOT / 'downloads' / (NAME + '.zip'))
    args = parser.parse_args()
    print(json.dumps(build(args.output_dir.resolve(), args.archive.resolve()), indent=2))
