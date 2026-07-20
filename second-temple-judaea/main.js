import { bus } from './js/core/bus.js';
import { makeRng } from './js/core/rng.js';

const rng = makeRng(516); // seed: the year the Second Temple stood

bus.on('boot', () => {
  const el = document.getElementById('boot-status');
  if (el) el.textContent = `ready — seed roll ${Math.floor(rng() * 6) + 1}`;
});

bus.emit('boot');
