// Screen-space decluttering, shared by the renderer and headless checks.
// Stable priority and bounded offsets keep a name near the place it names.
export function layoutProvinceLabels(candidates, obstacles, viewport) {
  const occupied = [...obstacles];
  const placed = [];
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const c of [...candidates].sort((a, b) => b.priority - a.priority || a.id - b.id)) {
    for (const dy of [0, 14, -14, -48, 48]) {
      const box = { x: c.x - c.w / 2 - 3, y: c.y + dy - c.h / 2 - 2,
        w: c.w + 6, h: c.h + 4 };
      if (box.x < 0 || box.y < 0 || box.x + box.w > viewport.w || box.y + box.h > viewport.h) continue;
      if (occupied.some(b => overlaps(box, b))) continue;
      occupied.push(box);
      placed.push({ ...c, y: c.y + dy, box });
      break;
    }
  }
  return placed;
}
