// js/ui/format.js — shared formatting helpers for the UI package (SPEC §8).
// Pure functions + a warn-once utility; no DOM assumptions beyond strings.

const _warned = new Set();

/** Log a warning once per key; never throws. */
export function warnOnce(key, err) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[ui] ' + key, err !== undefined ? err : '');
}

/** Escape text for safe innerHTML interpolation. */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** [r,g,b] (0-255) -> css color. */
export function rgb(c) {
  if (!Array.isArray(c) || c.length < 3) return '#887a5e';
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

export function rgba(c, a) {
  if (!Array.isArray(c) || c.length < 3) return `rgba(136,122,94,${a})`;
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

/** Thousands separators for an integer. */
export function fmtInt(n) {
  n = Math.round(Number(n) || 0);
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '−' : '') + s;
}

/** Treasury-style number: one decimal under 1000, grouped integer above. */
export function fmtMoney(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  const body = a >= 1000 ? String(Math.round(a)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : a.toFixed(1);
  return (n < 0 ? '−' : '') + body;
}

/** Men count: '850', '12.3k', '120k'. */
export function fmtMen(n) {
  n = Math.max(0, Math.round(Number(n) || 0));
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 100 ? String(Math.round(k)) : k.toFixed(1).replace(/\.0$/, '')) + 'k';
  }
  return String(n);
}

/** {y,m,d} -> '1 June 66 CE'. */
export function fmtDate(date, monthNames) {
  if (!date) return '';
  const m = (Array.isArray(monthNames) && monthNames[date.m - 1]) || ('M' + date.m);
  return `${date.d} ${m} ${date.y} CE`;
}

/** Signed value with explicit +/− and up to `digits` decimals. */
export function signed(n, digits = 0) {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const s = digits > 0 ? String(Math.round(a * 10 ** digits) / 10 ** digits) : String(Math.round(a));
  return (v < 0 ? '−' : '+') + s;
}

/** [{label, value}] -> multi-line tooltip string. */
export function ttLines(rows) {
  if (!Array.isArray(rows)) return '';
  return rows.map((r) => {
    if (!r) return '';
    let v = r.value;
    if (typeof v === 'number') {
      const rv = Math.round(v * 100) / 100;
      v = (rv > 0 ? '+' : rv < 0 ? '−' : '') + Math.abs(rv);
    }
    return `${r.label}: ${v}`;
  }).filter(Boolean).join('\n');
}

/** 'olive_oil' -> 'Olive Oil'. */
export function titleCase(k) {
  return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
