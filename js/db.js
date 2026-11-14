// Base de datos local (IndexedDB). Los datos quedan en este dispositivo.
// Diseñada con ids tipo texto para poder sincronizar con la nube en una fase posterior.
const DEFAULT_CONFIG = {
  razonSocial: 'MI NEGOCIO',
  nombreComercial: '',
  ruc: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: '',
  pie: '¡Gracias por su compra!',
  whatsappResumen: '',   // celular que recibe el resumen del día al cerrar caja
  qrYape: '',            // imagen del QR (Izipay, Yape o Plin) que se muestra al cobrar
  serieNV: 'NV01',
  igv: 18,
  ticketAncho: 80
};

const DB = (() => {
  const NAME = 'kipu_ventas', VERSION = 1;
  const STORES = ['settings', 'products', 'customers', 'sales', 'cash_sessions', 'cash_movements'];
  let _db;

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = t => new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Operación cancelada'));
  });

  function open() {
    if (_db) return _db;
    _db = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('settings', { keyPath: 'key' });
        d.createObjectStore('products', { keyPath: 'id' });
        d.createObjectStore('customers', { keyPath: 'id' });
        const s = d.createObjectStore('sales', { keyPath: 'id' });
        s.createIndex('dia', 'dia');
        s.createIndex('cajaId', 'cajaId');
        d.createObjectStore('cash_sessions', { keyPath: 'id' });
        const m = d.createObjectStore('cash_movements', { keyPath: 'id' });
        m.createIndex('cajaId', 'cajaId');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return _db;
  }

  async function os(name, mode = 'readonly') {
    const d = await open();
    return d.transaction(name, mode).objectStore(name);
  }

  const api = {
    STORES,
    all: async n => req((await os(n)).getAll()),
    get: async (n, id) => req((await os(n)).get(id)),
    put: async (n, obj) => {
      const d = await open(); const t = d.transaction(n, 'readwrite');
      t.objectStore(n).put(obj); await done(t); return obj;
    },
    putMany: async (n, list) => {
      const d = await open(); const t = d.transaction(n, 'readwrite');
      const s = t.objectStore(n); list.forEach(o => s.put(o)); await done(t);
    },
    del: async (n, id) => {
      const d = await open(); const t = d.transaction(n, 'readwrite');
      t.objectStore(n).delete(id); await done(t);
    },
    byIndex: async (n, idx, val) => req((await os(n)).index(idx).getAll(val)),
    byRange: async (n, idx, lo, hi) => req((await os(n)).index(idx).getAll(IDBKeyRange.bound(lo, hi))),

    getConfig: async () => {
      const r = await api.get('settings', 'config');
      return Object.assign({}, DEFAULT_CONFIG, r ? r.value : {});
    },
    setConfig: cfg => api.put('settings', { key: 'config', value: cfg }),
    nextNumber: async serie => {
      const r = await api.get('settings', 'corr_' + serie);
      return (r ? r.value : 0) + 1;
    },

    /** Guarda la venta, asigna el correlativo y descuenta stock en una sola transacción. */
    createSale: async sale => {
      const d = await open();
      const t = d.transaction(['sales', 'products', 'settings'], 'readwrite');
      const st = t.objectStore('settings'), ps = t.objectStore('products');
      const key = 'corr_' + sale.serie;
      const c = await req(st.get(key));
      sale.numero = (c ? c.value : 0) + 1;
      st.put({ key, value: sale.numero });
      for (const it of sale.items) {
        if (!it.productId) continue;
        const p = await req(ps.get(it.productId));
        if (p && p.controlStock) { p.stock = U.r3(p.stock - it.qty); ps.put(p); }
      }
      t.objectStore('sales').put(sale);
      await done(t);
      return sale;
    },

    /** Anula la venta y devuelve el stock. */
    annulSale: async (id, motivo) => {
      const d = await open();
      const t = d.transaction(['sales', 'products'], 'readwrite');
      const ss = t.objectStore('sales'), ps = t.objectStore('products');
      const sale = await req(ss.get(id));
      if (!sale || sale.estado === 'anulada') { t.abort(); throw new Error('La venta ya está anulada'); }
      sale.estado = 'anulada';
      sale.anulacion = { motivo, fecha: new Date().toISOString() };
      for (const it of sale.items) {
        if (!it.productId) continue;
        const p = await req(ps.get(it.productId));
        if (p && p.controlStock) { p.stock = U.r3(p.stock + it.qty); ps.put(p); }
      }
      ss.put(sale);
      await done(t);
      return sale;
    },

    exportAll: async () => {
      const out = { app: 'faczil', version: 1, exportado: new Date().toISOString(), data: {} };
      for (const s of STORES) out.data[s] = await api.all(s);
      return out;
    },
    importAll: async json => {
      // 'kipu-ventas' es el nombre anterior de la app: sus respaldos siguen siendo válidos.
      if (!json || !['faczil', 'kipu-ventas'].includes(json.app) || !json.data) throw new Error('El archivo no es un respaldo de FACZIL');
      const d = await open();
      const t = d.transaction(STORES, 'readwrite');
      for (const s of STORES) {
        const o = t.objectStore(s);
        o.clear();
        (json.data[s] || []).forEach(x => o.put(x));
      }
      await done(t);
    },
    clearAll: async () => {
      const d = await open();
      const t = d.transaction(STORES, 'readwrite');
      STORES.forEach(s => t.objectStore(s).clear());
      await done(t);
    }
  };
  return api;
})();
