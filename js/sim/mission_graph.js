// The tree's positions and prerequisites are one contract. Author order and
// declared rows establish chronology; measured difficulty may add space, but
// must never reorder the missions or make a lower node an independent root.
const graphs = new WeakMap();
export const missionId = (m, i) => m?.id ? String(m.id) : 'm' + i;
export const isMissionTree = list => Array.isArray(list) && list.some(m => m
  && (Array.isArray(m.requires) && m.requires.length || Number.isFinite(m.col)));

export function missionGraph(list) {
  if (!Array.isArray(list)) return { nodes: [], invalid: new Set() };
  if (graphs.has(list)) return graphs.get(list);
  const tree = isMissionTree(list);
  const nodes = list.map((m, i) => ({ id: missionId(m, i), index: i,
    col: tree ? Math.max(0, Math.min(4, Number(m?.col) | 0)) : 0,
    row: tree ? Math.max(0, Number(m?.row) | 0) : i,
    requires: tree ? [...new Set((Array.isArray(m?.requires) ? m.requires : []).map(String))]
      : i ? [missionId(list[i - 1], i - 1)] : [],
  }));
  const byId = new Map(nodes.map(n => [n.id, n])), placed = new Set(), pending = new Set(nodes), last = new Map();
  const duplicates = new Set(nodes.filter((n, i) => nodes.findIndex(p => p.id === n.id) !== i).map(n => n.id));
  const invalid = new Set(duplicates);
  const floor = n => Math.max(n.row, ...n.requires.map(id => (byId.get(id)?.row ?? -1) + 1));
  function place(n) {
    const previous = last.get(n.col);
    if (previous && !n.requires.includes(previous.id)) n.requires.push(previous.id);
    n.row = floor(n);
    last.set(n.col, n); placed.add(n.id); pending.delete(n);
  }
  // Topological placement preserves cross-column requirements. Each new
  // vertical edge points to an already placed node, so it cannot create a cycle.
  while (pending.size) {
    const available = [...pending].filter(n => !duplicates.has(n.id) && n.requires.every(id => placed.has(id)));
    if (!available.length) break;
    available.sort((a, b) => floor(a) - floor(b) || a.index - b.index);
    place(available[0]);
  }
  // Broken definitions fail closed. They still receive distinct display seats
  // so an invalid prerequisite cannot hide a medallion beneath another one.
  for (const n of [...pending]) { invalid.add(n.id); place(n); }
  const graph = { nodes, invalid };
  graphs.set(list, graph);
  return graph;
}
