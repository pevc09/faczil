// Componentes de interfaz: íconos, ventanas, avisos, ticket e impresión.
window.Views = {};
const UI = {};

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.2h11.6L21.5 7H6.3"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  box: '<path d="M3 7.5l9-4.5 9 4.5-9 4.5z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/><path d="M12 12v9"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  chat: '<path d="M4 20l1.4-4A8 8 0 1 1 8.3 19z"/><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
};
UI.icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---------- Avisos ----------
UI.toast = (msg, type = 'ok') => {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `${UI.icon(type === 'ok' ? 'check' : 'alert')}<span>${U.esc(msg)}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3200);
};

// ---------- Ventanas ----------
UI.modal = ({ title, body, actions = [], size = '' }) => {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
      <header><h3>${U.esc(title)}</h3><button class="icon-btn" data-close aria-label="Cerrar">${UI.icon('x')}</button></header>
      <div class="modal-body">${body}</div>
      ${actions.length ? '<footer></footer>' : ''}
    </div>`;
  const onKey = e => { if (e.key === 'Escape' && root.lastElementChild === wrap) close(); };
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('[data-close]').onclick = close;
  const f = wrap.querySelector('footer');
  actions.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.cls || '');
    b.innerHTML = a.label;
    b.onclick = async () => {
      if (!a.onClick) return close();
      b.disabled = true;
      try { await a.onClick({ el: wrap, close, btn: b }); } finally { b.disabled = false; }
    };
    f.appendChild(b);
  });
  // Enter en un campo = acción principal
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input:not([list])') && f) {
      const p = f.querySelector('.btn.primary, .btn.danger');
      if (p) { e.preventDefault(); p.click(); }
    }
  });
  root.appendChild(wrap);
  const first = wrap.querySelector('[autofocus], input:not([type=checkbox]):not([readonly]), select, textarea');
  if (first) setTimeout(() => first.focus(), 40);
  return { el: wrap, close };
};

UI.confirm = (msg, { title = 'Confirmar', ok = 'Aceptar', danger = false } = {}) => new Promise(res => {
  let answered = false;
  const m = UI.modal({
    title, size: 'sm', body: `<p>${U.esc(msg)}</p>`,
    actions: [
      { label: 'Cancelar', onClick: ({ close }) => { answered = true; close(); res(false); } },
      { label: ok, cls: danger ? 'danger' : 'primary', onClick: ({ close }) => { answered = true; close(); res(true); } }
    ]
  });
  m.el.querySelector('[data-close]').addEventListener('click', () => { if (!answered) res(false); });
});

/** Lee los campos [name] de un contenedor. */
UI.formData = el => {
  const o = {};
  el.querySelectorAll('[name]').forEach(i => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
  return o;
};
UI.fieldError = (el, name, msg) => {
  const i = el.querySelector(`[name="${name}"]`);
  if (!i) return UI.toast(msg, 'error');
  const f = i.closest('.field');
  f.classList.add('invalid');
  let e = f.querySelector('.err');
  if (!e) { e = document.createElement('small'); e.className = 'err'; f.appendChild(e); }
  e.textContent = msg;
  i.focus();
  i.addEventListener('input', () => { f.classList.remove('invalid'); e.remove(); }, { once: true });
};

// ---------- Ticket ----------
UI.ticketHTML = (s, c) => {
  const t = s.totales;
  const cli = s.cliente || {};
  const rows = s.items.map(i => `
    <tr><td colspan="4" class="t-desc">${U.esc(i.nombre)}</td></tr>
    <tr><td>${U.qty(i.qty)} ${U.esc(U.UNIT_SHORT[i.unidad] || '')}</td><td></td><td class="r">${U.fixed(i.precio)}</td><td class="r">${U.fixed(i.qty * i.precio)}</td></tr>`).join('');
  return `<div class="ticket w${c.ticketAncho || 80}">
    ${s.estado === 'anulada' ? '<div class="t-void">ANULADA</div>' : ''}
    ${c.logo ? `<img class="t-logo" src="${c.logo}" alt="">` : ''}
    <div class="t-c t-b t-lg">${U.esc(c.nombreComercial || c.razonSocial)}</div>
    ${c.nombreComercial && c.razonSocial ? `<div class="t-c">${U.esc(c.razonSocial)}</div>` : ''}
    ${c.ruc ? `<div class="t-c">RUC ${U.esc(c.ruc)}</div>` : ''}
    ${c.direccion ? `<div class="t-c">${U.esc(c.direccion)}</div>` : ''}
    ${c.telefono ? `<div class="t-c">Tel. ${U.esc(c.telefono)}</div>` : ''}
    <div class="t-hr"></div>
    <div class="t-c t-b">NOTA DE VENTA</div>
    <div class="t-c t-b">${U.docNum(s)}</div>
    <div class="t-hr"></div>
    <div>Fecha: ${U.fmtDateTime(s.fecha)}</div>
    <div>Cliente: ${U.esc(cli.nombre || 'CLIENTES VARIOS')}</div>
    ${cli.numDoc ? `<div>${U.DOC_TYPES[cli.tipoDoc] || 'Doc.'}: ${U.esc(cli.numDoc)}</div>` : ''}
    ${cli.direccion ? `<div>Dir.: ${U.esc(cli.direccion)}</div>` : ''}
    <div class="t-hr"></div>
    <table class="t-items"><thead><tr><th>Cant.</th><th></th><th class="r">P.U.</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="t-hr"></div>
    ${t.gravada ? `<div class="t-row"><span>Op. gravada</span><span>${U.fixed(t.gravada)}</span></div>` : ''}
    ${t.exonerada ? `<div class="t-row"><span>Op. exonerada</span><span>${U.fixed(t.exonerada)}</span></div>` : ''}
    ${t.inafecta ? `<div class="t-row"><span>Op. inafecta</span><span>${U.fixed(t.inafecta)}</span></div>` : ''}
    <div class="t-row"><span>IGV (${s.igvRate}%)</span><span>${U.fixed(t.igv)}</span></div>
    <div class="t-row t-b t-lg"><span>TOTAL S/</span><span>${U.fixed(t.total)}</span></div>
    <div class="t-small">SON: ${U.letras(t.total)}</div>
    <div class="t-hr"></div>
    <div class="t-row"><span>Pago: ${U.PAY[s.pago.metodo] || s.pago.metodo}</span><span>${U.fixed(s.pago.recibido || t.total)}</span></div>
    ${s.pago.vuelto ? `<div class="t-row"><span>Vuelto</span><span>${U.fixed(s.pago.vuelto)}</span></div>` : ''}
    ${s.nota ? `<div class="t-small">Nota: ${U.esc(s.nota)}</div>` : ''}
    <div class="t-hr"></div>
    ${c.pie ? `<div class="t-c">${U.esc(c.pie)}</div>` : ''}
    <div class="t-c t-small">Documento interno. Canjeable por boleta o factura.</div>
  </div>`;
};

UI.printTicket = sale => {
  const area = document.getElementById('print-area');
  area.innerHTML = UI.ticketHTML(sale, App.state.settings);
  document.documentElement.style.setProperty('--ticket-w', (App.state.settings.ticketAncho || 80) + 'mm');
  const imgs = [...area.querySelectorAll('img')];
  Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => window.print());
};

UI.whatsappText = (s, c) => {
  const lines = [
    `*${c.nombreComercial || c.razonSocial}*`,
    `Nota de venta ${U.docNum(s)}`,
    `Fecha: ${U.fmtDateTime(s.fecha)}`,
    '',
    ...s.items.map(i => `• ${U.qty(i.qty)} x ${i.nombre} — ${U.money(i.qty * i.precio)}`),
    '',
    `*Total: ${U.money(s.totales.total)}*`,
    `Pago: ${U.PAY[s.pago.metodo] || s.pago.metodo}`
  ];
  if (c.pie) lines.push('', c.pie);
  return lines.join('\n');
};

UI.shareWhatsApp = sale => {
  let phone = String(sale.cliente?.telefono || '').replace(/\D/g, '');
  if (phone.length === 9) phone = '51' + phone;
  const text = encodeURIComponent(UI.whatsappText(sale, App.state.settings));
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
};

/** Muestra el ticket con acciones. extra: botones adicionales. */
UI.showTicket = (sale, { title, extra = [] } = {}) => UI.modal({
  title: title || `Nota de venta ${U.docNum(sale)}`,
  size: 'narrow',
  body: `<div class="ticket-preview">${UI.ticketHTML(sale, App.state.settings)}</div>`,
  actions: [
    ...extra,
    { label: `${UI.icon('chat')} WhatsApp`, onClick: () => UI.shareWhatsApp(sale) },
    { label: `${UI.icon('print')} Imprimir`, cls: 'primary', onClick: () => UI.printTicket(sale) }
  ]
});

/** Foto del producto o, si no tiene, un recuadro de color con su inicial. */
UI.thumb = (p, cls = 'thumb') => `<span class="${cls}" style="--h:${U.hue(p.categoria || p.nombre)}">${
  p.imagen ? `<img src="${p.imagen}" alt="" loading="lazy">` : `<span>${U.esc((p.nombre[0] || '?').toUpperCase())}</span>`}</span>`;

UI.empty = (icon, title, text, btn = '') => `<div class="empty card">
  <div class="empty-ic">${UI.icon(icon)}</div><h2>${title}</h2><p>${text}</p>${btn}</div>`;
