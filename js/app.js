// Arranque, estado global y navegación.
const App = (() => {
  const state = { settings: { ...DEFAULT_CONFIG }, products: [], customers: [], cash: null };
  const NAV = [
    ['panel', 'Panel', 'home'],
    ['vender', 'Vender', 'cart'],
    ['ventas', 'Ventas', 'receipt'],
    ['productos', 'Productos', 'box'],
    ['clientes', 'Clientes', 'users'],
    ['caja', 'Caja', 'cash'],
    ['config', 'Ajustes', 'gear']
  ];
  let cleanup = null;

  async function load() {
    state.settings = await DB.getConfig();
    state.products = await DB.all('products');
    state.customers = (await DB.all('customers')).sort((a, b) => a.nombre.localeCompare(b.nombre));
    state.cash = (await DB.all('cash_sessions')).find(c => c.estado === 'abierta') || null;
  }

  function current() { return (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'panel'; }

  function buildNav() {
    const html = NAV.map(([k, label, ic]) => `<a href="#/${k}" data-k="${k}">${UI.icon(ic)}<span>${label}</span></a>`).join('');
    document.getElementById('sidenav').innerHTML = html;
    document.getElementById('bottomnav').innerHTML = html;
  }

  function chrome() {
    const k = current();
    document.querySelectorAll('#sidenav a, #bottomnav a').forEach(a => a.classList.toggle('on', a.dataset.k === k));
    const s = state.settings;
    document.getElementById('brand-sub').textContent = s.nombreComercial || s.razonSocial || 'Ventas';
    document.getElementById('side-foot').innerHTML = state.cash
      ? `<a href="#/caja" class="cash-pill open">${UI.icon('unlock')} Caja abierta</a>`
      : `<a href="#/caja" class="cash-pill">${UI.icon('lock')} Caja cerrada</a>`;
  }

  async function render() {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    const k = current();
    const view = Views[k] || Views.panel;
    const el = document.getElementById('view');
    el.className = 'view view-' + k;
    el.innerHTML = '';
    chrome();
    try {
      cleanup = await view.render(el);
    } catch (err) {
      console.error(err);
      el.innerHTML = UI.empty('alert', 'Algo salió mal', U.esc(err.message || String(err)));
    }
  }

  async function reload() { await load(); await render(); }

  async function init() {
    buildNav();
    try {
      await load();
    } catch (err) {
      document.getElementById('view').innerHTML = UI.empty('alert', 'No se pudo abrir la base de datos',
        'Tu navegador bloqueó el almacenamiento local. Abre la app en Chrome o Edge sin modo incógnito.');
      return;
    }
    window.addEventListener('hashchange', render);
    await render();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // Pide al navegador que no borre los datos del negocio si falta espacio en disco.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  return { state, init, render, reload, load, chrome };
})();

App.init();
