export const MESSAGE_CATEGORIES = { siege: 'Sieges', battle: 'Battles', movement: 'Approaching armies',
  truce: 'Expiring truces', recruitment: 'Recruitment', general: 'Other notices' };
export const MESSAGE_MODES = { off: 'Off', toast: 'Notice', persistent: 'Persistent alert', popup: 'Popup', pause: 'Pause + alert' };
export const DEFAULT_MESSAGE_MODES = Object.freeze(Object.fromEntries(Object.keys(MESSAGE_CATEGORIES).map(k => [k, 'toast'])));
export function normalizeMessageModes(value) {
  return Object.fromEntries(Object.keys(MESSAGE_CATEGORIES).map(k => [k,
    Object.hasOwn(MESSAGE_MODES, value?.[k]) ? value[k] : DEFAULT_MESSAGE_MODES[k]]));
}
export function messageCategory(payload) {
  if (Object.hasOwn(MESSAGE_CATEGORIES, payload?.category)) return payload.category;
  const title = payload?.title || '';
  if (/siege|fortress.*falls/i.test(title)) return 'siege';
  if (/battle|army.*(destroyed|annihilated)/i.test(title)) return 'battle';
  if (/recruit|muster|rally/i.test(title)) return 'recruitment';
  if (/truce/i.test(title)) return 'truce';
  return 'general';
}
