// Installable browser app: shares this origin's campaign shelf with browser tabs.
const offlineFile = !!globalThis.__JU_OFFLINE__;
const listeners = new Set();
let installPrompt = null;
let registration = null;
let started = false;
let panel = null;
let panelSubscription = null;
let previousFocus = null;
const state = { ready: offlineFile, preparing: false, error: '', installed: false, canInstall: false };

function emit() { for (const fn of listeners) fn({ ...state }); }
export function appState() { return { ...state }; }
export function onAppState(fn) { listeners.add(fn); fn(appState()); return () => listeners.delete(fn); }

export function prepareOffline() {
  const worker = navigator.serviceWorker.controller || (registration && registration.active);
  if (!worker) return;
  state.preparing = true;
  state.error = '';
  emit();
  worker.postMessage({ type: 'ju-precache' });
}

export function initAppSupport() {
  if (started || offlineFile || typeof window === 'undefined') return;
  started = true;
  state.installed = !!(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    state.canInstall = true;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    state.canInstall = false;
    state.installed = true;
    emit();
  });
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'ju-precached') return;
    // Older workers only report a count; wait for the current worker's full check.
    if (typeof event.data.complete !== 'boolean') return;
    state.preparing = false;
    state.ready = event.data.complete;
    state.error = state.ready ? '' : 'Some offline files are missing. Reconnect and retry.';
    emit();
  });
  navigator.serviceWorker.addEventListener('controllerchange', prepareOffline);
  window.addEventListener('online', prepareOffline);
  const register = async () => {
    state.preparing = true;
    emit();
    try {
      registration = await navigator.serviceWorker.register('./sw.js');
      const ready = await navigator.serviceWorker.ready;
      registration = ready;
      prepareOffline();
    } catch (e) {
      state.preparing = false;
      state.error = 'Offline setup could not finish. Reconnect and retry.';
      emit();
      console.warn('[app]', e);
    }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export function offlineStatus(s = state) {
  if (s.ready) return 'Ready to play offline';
  if (s.error) return s.error;
  return 'Downloading files for offline play…';
}

export function closeInstallPanel() {
  if (panelSubscription) panelSubscription();
  panelSubscription = null;
  if (panel) panel.remove();
  panel = null;
  if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  previousFocus = null;
}

export function openInstallPanel() {
  if (offlineFile) {
    window.open('https://quadrin.github.io/judaea-universalis/?install=1', '_blank', 'noopener');
    return;
  }
  closeInstallPanel();
  previousFocus = document.activeElement;
  panel = document.createElement('div');
  panel.id = 'install-panel';
  panel.innerHTML = `<div class="modal-scrim"></div>
    <div class="ev-card peace-card sv-card app-card" role="dialog" aria-modal="true" aria-labelledby="app-install-title">
      <h2 class="peace-title" id="app-install-title">Install Judaea Universalis</h2>
      <p>Launch the game from your applications or desktop in its own window, with the lion icon.</p>
      <p>In Chrome or Edge, the app and website share saved campaigns in the same browser profile.</p>
      <p>To bring a campaign from the HTML download, use <b>Saved campaigns → Download</b> there, then <b>Import save file</b> here.</p>
      <p class="app-ready" data-ref="app-ready" role="status"></p>
      <p data-ref="app-instructions">In Chrome, open ⋮ → Cast, save, and share → Install page as app. You can also use the install icon in the address bar. In Edge, use ⋯ → More tools → Apps → Install this site as an app.</p>
      <p>Wait for “Ready to play offline” before disconnecting.</p>
      <div class="app-actions">
        <button class="btn" data-ref="app-native">Install game</button>
        <button class="btn" data-ref="app-retry">Retry offline setup</button>
        <button class="btn" data-ref="app-close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(panel);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeInstallPanel(); }
    if (event.key !== 'Tab') return;
    const buttons = [...panel.querySelectorAll('button')].filter((b) => !b.hidden && !b.disabled);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  panel.querySelector('.modal-scrim').addEventListener('click', closeInstallPanel);
  panel.querySelector('[data-ref="app-close"]').addEventListener('click', closeInstallPanel);
  panel.querySelector('[data-ref="app-retry"]').addEventListener('click', prepareOffline);
  panel.querySelector('[data-ref="app-native"]').addEventListener('click', async () => {
    const prompt = installPrompt;
    if (!prompt || !state.ready) return;
    installPrompt = null;
    state.canInstall = false;
    emit();
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (e) { console.warn('[install]', e); }
  });
  panel.querySelector('[data-ref="app-close"]').focus();
  panelSubscription = onAppState((s) => {
    if (!panel) return;
    panel.querySelector('[data-ref="app-ready"]').textContent = offlineStatus(s);
    const native = panel.querySelector('[data-ref="app-native"]');
    native.hidden = !s.canInstall || s.installed;
    native.disabled = !s.ready;
    panel.querySelector('[data-ref="app-retry"]').hidden = s.ready || s.preparing;
    panel.querySelector('[data-ref="app-instructions"]').hidden = s.canInstall;
    if (s.installed) panel.querySelector('[data-ref="app-instructions"]').textContent = 'Installed. Launch Judaea Universalis from your applications or launcher.';
  });
}
