// Punto de venta: catálogo, carrito, cobro y ticket.
(() => {
  const V = Views.vender = {};
  let cart = [], cat = '', query = '', customer = null;
  const VARIOS = { tipoDoc: '0', numDoc: '', nombre: 'CLIENTES VARIOS' };
  /** Apartado rápido: lo que no se puede escanear (cigarros sueltos, fruta, chifles…). */
  const SIN_CODIGO = '__sin_codigo__';

  V.render = el => {
    const S = App.state;
    if (!S.cash) {
      el.innerHTML = `<div class="page-head"><h1>Vender</h1></div>` +
        UI.empty('lock', 'La caja está cerrada', 'Abre la caja indicando el efectivo con el que empiezas el día. Así al cierre sabrás cuánto debe haber.',
          `<button class="btn primary lg" id="open">${UI.icon('unlock')} Abrir caja</button>`);
      el.querySelector('#open').onclick = () => Views.caja.openDialog(() => App.render());
      return;
    }

    el.innerHTML = `
      <div class="pos" id="pos">
        <section class="pos-products">
          <div class="searchbox big">${UI.icon('search')}<input id="q" type="search" placeholder="Buscar o escanear código…  (F2)" value="${U.esc(query)}" autocomplete="off"></div>
          <div class="chips" id="cats"></div>
          <div class="pgrid" id="pgrid"></div>
        </section>
        <aside class="cart" id="cart" aria-label="Venta actual"></aside>
      </div>
      <button class="cartbar" id="cartbar" type="button"></button>`;
    const $ = s => el.querySelector(s);
    const pos = $('#pos'), q = $('#q');

    // Unidades vendidas por producto en los últimos 30 días: ordena el apartado "Sin código" por lo que más sale.
    const vendidos = new Map();
    DB.byRange('sales', 'dia', U.addDays(U.today(), -30), U.today()).then(list => {
      list.filter(s => s.estado !== 'anulada').forEach(s => s.items.forEach(i => vendidos.set(i.productId, (vendidos.get(i.productId) || 0) + i.qty)));
      if (cat === SIN_CODIGO && el.isConnected) renderGrid();
    }).catch(() => {});

    const filtered = () => {
      const v = query.trim().toLowerCase();
      const porNombre = (a, b) => a.nombre.localeCompare(b.nombre);
      return S.products
        .filter(p => (!cat || (cat === SIN_CODIGO ? !p.codigo : p.categoria === cat)) && (!v || p.nombre.toLowerCase().includes(v) || (p.codigo || '').toLowerCase().includes(v)))
        .sort(cat === SIN_CODIGO ? (a, b) => (vendidos.get(b.id) || 0) - (vendidos.get(a.id) || 0) || porNombre(a, b) : porNombre);
    };

    function renderCats() {
      const cats = [...new Set(S.products.map(p => p.categoria).filter(Boolean))].sort();
      const nSin = S.products.filter(p => !p.codigo).length;
      if (cat === SIN_CODIGO && !nSin) cat = '';
      const chip = (c, label) => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${U.esc(c)}">${label}</button>`;
      $('#cats').innerHTML = chip('', 'Todos')
        + (nSin ? `<button class="chip quick ${cat === SIN_CODIGO ? 'on' : ''}" data-c="${SIN_CODIGO}" title="Productos sin código de barras (F3)">${UI.icon('bolt')} Sin código <small>${nSin}</small></button>` : '')
        + cats.map(c => chip(c, U.esc(c))).join('');
      $('#cats').querySelectorAll('.chip').forEach(b => b.onclick = () => { cat = b.dataset.c; renderCats(); renderGrid(); });
    }

    function renderGrid() {
      const g = $('#pgrid');
      if (!S.products.length) {
        g.innerHTML = `<div class="empty small"><p>Aún no tienes productos registrados.</p><a class="btn primary" href="#/productos">Agregar productos</a></div>`;
        return;
      }
      const list = filtered();
      if (!list.length) { g.innerHTML = '<p class="muted pad">Sin resultados.</p>'; return; }
      g.innerHTML = list.map(p => {
        const st = p.controlStock
          ? `<span class="stock ${p.stock <= 0 ? 'bad' : p.stock <= p.stockMin ? 'warn' : ''}">${p.stock <= 0 ? 'Agotado' : 'Stock ' + U.qty(p.stock)}</span>` : '';
        return `<button class="pcard" data-id="${p.id}">
          ${UI.thumb(p, 'pmedia')}
          <span class="pbody">
            <span class="pname">${U.esc(p.nombre)}</span>
            <span class="pmeta"><strong>${U.money(p.precio)}</strong>${st}</span>
          </span>
        </button>`;
      }).join('');
      g.querySelectorAll('.pcard').forEach(b => b.onclick = () => add(S.products.find(p => p.id === b.dataset.id)));
      updateBadges();
    }

    /** Marca los productos que ya están en la venta sin volver a dibujar las fotos. */
    function updateBadges() {
      $('#pgrid').querySelectorAll('.pcard').forEach(b => {
        const it = cart.find(i => i.productId === b.dataset.id);
        b.classList.toggle('in', !!it);
        let badge = b.querySelector('.pbadge');
        if (!it) { if (badge) badge.remove(); return; }
        if (!badge) { badge = document.createElement('span'); badge.className = 'pbadge'; b.appendChild(badge); }
        badge.textContent = U.qty(it.qty);
      });
    }

    function add(p) {
      const it = cart.find(i => i.productId === p.id);
      const next = (it ? it.qty : 0) + 1;
      if (p.controlStock && next > p.stock) UI.toast(`Stock insuficiente: quedan ${U.qty(p.stock)} de ${p.nombre}`, 'warn');
      if (it) it.qty = U.r3(next);
      else cart.push({ productId: p.id, codigo: p.codigo || '', nombre: p.nombre, unidad: p.unidad || 'NIU', precio: p.precio, qty: 1, tipoIGV: p.tipoIGV || '10' });
      renderCart(); updateBadges();
    }

    function renderCart() {
      const t = U.calcTotals(cart, S.settings.igv);
      const n = cart.reduce((a, i) => a + i.qty, 0);
      $('#cart').innerHTML = `
        <header class="cart-head">
          <h2>Venta actual</h2>
          <div class="btn-row">
            <button class="btn ghost sm" id="clear" ${cart.length ? '' : 'disabled'}>Vaciar</button>
            <button class="icon-btn only-mobile" id="hide" aria-label="Volver a productos">${UI.icon('x')}</button>
          </div>
        </header>
        <div class="cart-items">${cart.length ? cart.map((i, k) => `
          <div class="citem" data-k="${k}">
            <div class="citem-top"><span class="citem-name">${U.esc(i.nombre)}</span><button class="icon-btn sm" data-act="del" aria-label="Quitar">${UI.icon('x')}</button></div>
            <div class="citem-bot">
              <div class="stepper">
                <button data-act="minus" aria-label="Menos">${UI.icon('minus')}</button>
                <input data-f="qty" inputmode="decimal" value="${U.qty(i.qty)}" aria-label="Cantidad">
                <button data-act="plus" aria-label="Más">${UI.icon('plus')}</button>
              </div>
              <label class="pu"><span>P.U.</span><input data-f="precio" inputmode="decimal" value="${i.precio.toFixed(2)}" aria-label="Precio unitario"></label>
              <strong class="ltotal num">${U.money(i.qty * i.precio)}</strong>
            </div>
          </div>`).join('') : `<div class="cart-empty">${UI.icon('cart')}<p>Toca un producto para agregarlo</p></div>`}
        </div>
        <footer class="cart-foot">
          <button class="cust" id="cust" type="button">${UI.icon('users')}<span>${U.esc(customer ? Views.clientes.label(customer) : 'Clientes varios')}</span><small>Cambiar</small></button>
          ${t.gravada ? `<div class="trow"><span>Op. gravada</span><span class="num">${U.money(t.gravada)}</span></div>` : ''}
          ${t.exonerada ? `<div class="trow"><span>Op. exonerada</span><span class="num">${U.money(t.exonerada)}</span></div>` : ''}
          ${t.inafecta ? `<div class="trow"><span>Op. inafecta</span><span class="num">${U.money(t.inafecta)}</span></div>` : ''}
          <div class="trow"><span>IGV (${S.settings.igv}%)</span><span class="num">${U.money(t.igv)}</span></div>
          <div class="trow total"><span>Total</span><span class="num">${U.money(t.total)}</span></div>
          <button class="btn primary lg block" id="pay" ${cart.length ? '' : 'disabled'}>Cobrar ${U.money(t.total)} <kbd class="hide-sm">F9</kbd></button>
        </footer>`;
      const bar = $('#cartbar');
      bar.innerHTML = `<span class="badge">${U.qty(n)}</span><span>Ver venta</span><strong class="num">${U.money(t.total)}</strong>`;
      bar.classList.toggle('empty', !cart.length);
    }

    // Eventos del carrito (delegados)
    const cartEl = $('#cart');
    cartEl.addEventListener('click', async e => {
      if (e.target.closest('#clear')) {
        if (await UI.confirm('¿Quitar todos los productos de la venta?', { ok: 'Vaciar' })) { cart = []; renderCart(); updateBadges(); }
        return;
      }
      if (e.target.closest('#hide')) return pos.classList.remove('show-cart');
      if (e.target.closest('#pay')) return checkout();
      if (e.target.closest('#cust')) return pickCustomer();
      const act = e.target.closest('[data-act]')?.dataset.act;
      const row = e.target.closest('.citem');
      if (!act || !row) return;
      const it = cart[+row.dataset.k];
      if (act === 'del') cart.splice(+row.dataset.k, 1);
      if (act === 'plus') it.qty = U.r3(it.qty + 1);
      if (act === 'minus') { it.qty = U.r3(it.qty - 1); if (it.qty <= 0) cart.splice(+row.dataset.k, 1); }
      renderCart(); updateBadges();
    });
    cartEl.addEventListener('change', e => {
      const f = e.target.dataset.f, row = e.target.closest('.citem');
      if (!f || !row) return;
      const it = cart[+row.dataset.k], v = U.num(e.target.value);
      if (f === 'qty') { if (v > 0) it.qty = U.r3(v); else cart.splice(+row.dataset.k, 1); }
      if (f === 'precio' && v > 0) it.precio = U.r2(v);
      renderCart(); updateBadges();
    });
    cartEl.addEventListener('focusin', e => { if (e.target.matches('input')) e.target.select(); });
    $('#cartbar').onclick = () => { if (cart.length) pos.classList.add('show-cart'); };

    q.addEventListener('input', () => { query = q.value; renderGrid(); });
    q.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const v = q.value.trim().toLowerCase();
      if (!v) return;
      const list = filtered();
      const p = S.products.find(x => x.codigo && x.codigo.toLowerCase() === v) || (list.length === 1 ? list[0] : null);
      if (p) { add(p); q.value = ''; query = ''; renderGrid(); }
      else UI.toast(list.length ? 'Hay varios resultados, elige uno' : 'No se encontró el producto', 'warn');
    });

    function pickCustomer() {
      const m = UI.modal({
        title: 'Cliente de la venta',
        body: `<div class="searchbox">${UI.icon('search')}<input id="cq" type="search" placeholder="Nombre, DNI o RUC"></div>
          <div class="pick-list" id="cl"></div>`,
        actions: [{ label: `${UI.icon('plus')} Nuevo cliente`, onClick: ({ el, close }) => {
          const v = el.querySelector('#cq').value.trim();
          const pre = /^\d{8}$/.test(v) ? { tipoDoc: '1', numDoc: v } : /^\d{11}$/.test(v) ? { tipoDoc: '6', numDoc: v } : { nombre: v };
          close();
          Views.clientes.form(null, c => { customer = c; renderCart(); }, pre);
        } }]
      });
      const cq = m.el.querySelector('#cq'), cl = m.el.querySelector('#cl');
      const draw = () => {
        const v = cq.value.trim().toLowerCase();
        const list = S.customers.filter(c => !v || c.nombre.toLowerCase().includes(v) || (c.numDoc || '').includes(v)).slice(0, 50);
        cl.innerHTML = `<button class="pick ${!customer ? 'on' : ''}" data-id="">${UI.icon('users')}<span><strong>Clientes varios</strong><small>Sin documento</small></span></button>` +
          list.map(c => `<button class="pick ${customer && customer.id === c.id ? 'on' : ''}" data-id="${c.id}">${UI.icon('users')}<span><strong>${U.esc(c.nombre)}</strong><small>${c.numDoc ? U.DOC_TYPES[c.tipoDoc] + ' ' + U.esc(c.numDoc) : 'Sin documento'}</small></span></button>`).join('');
        cl.querySelectorAll('.pick').forEach(b => b.onclick = () => {
          customer = b.dataset.id ? S.customers.find(c => c.id === b.dataset.id) : null;
          m.close(); renderCart();
        });
      };
      cq.oninput = draw;
      draw();
    }

    function checkout() {
      if (!cart.length) return;
      const t = U.calcTotals(cart, S.settings.igv);
      let metodo = 'efectivo';
      const conQR = k => k === 'yape' || k === 'plin';
      const qrSrc = S.settings.qrYape || 'icons/qr-ejemplo.svg';
      const bills =[10, 20, 50, 100, 200].filter(b => b > t.total).slice(0, 3);
      const m = UI.modal({
        title: 'Cobrar',
        body: `
          <div class="pay-total"><span>Total a cobrar</span><strong class="num">${U.money(t.total)}</strong><small>${U.esc(customer ? customer.nombre : 'Clientes varios')}</small></div>
          <div class="field"><span>Medio de pago</span>
            <div class="seg" id="seg">${Object.entries(U.PAY).map(([k, l]) => `<button type="button" data-m="${k}" class="${k === metodo ? 'on' : ''}">${l}</button>`).join('')}</div>
          </div>
          <div id="cashbox">
            <label class="field"><span>Efectivo recibido</span><input id="rec" name="rec" inputmode="decimal" placeholder="${t.total.toFixed(2)}" autofocus></label>
            <div class="quick"><button type="button" data-v="${t.total}">Exacto</button>${bills.map(b => `<button type="button" data-v="${b}">S/ ${b}</button>`).join('')}</div>
            <div class="vuelto">Vuelto <strong class="num" id="vu">S/ 0.00</strong></div>
          </div>
          <div class="qrpay" id="qrbox" hidden>
            <button class="qrpay-img" id="qrzoom" type="button" title="Mostrar en grande al cliente"><img src="${qrSrc}" alt="QR para pagar"></button>
            <div class="qrpay-info">
              <strong>El cliente escanea y paga ${U.money(t.total)}</strong>
              <p>Cuando suene el aviso del pago, pulsa <b>Recibido</b>.</p>
              <button class="btn sm" id="qrfull" type="button">${UI.icon('search')} Mostrar en grande</button>
              ${S.settings.qrYape ? '' : '<p class="qrpay-aviso">Este QR es de ejemplo. Sube el tuyo en <a href="#/config" data-close-modal>Ajustes</a>.</p>'}
            </div>
          </div>
          <label class="field"><span>Nota (opcional)</span><input id="nota" maxlength="140" placeholder="Ej.: entregar a las 5 pm"></label>`,
        actions: [
          { label: 'Cancelar' },
          { label: `${UI.icon('check')} Confirmar venta`, cls: 'primary', onClick: async ({ el, close }) => {
            const recTxt = el.querySelector('#rec').value.trim();
            const rec = metodo === 'efectivo' && recTxt ? U.r2(U.num(recTxt)) : t.total;
            if (metodo === 'efectivo' && rec < t.total) return UI.fieldError(el, 'rec', 'El monto recibido es menor al total');
            const now = new Date();
            const cli = customer ? { id: customer.id, tipoDoc: customer.tipoDoc, numDoc: customer.numDoc, nombre: customer.nombre, direccion: customer.direccion, telefono: customer.telefono } : { ...VARIOS };
            const sale = {
              id: U.uid(), tipo: 'NV', serie: S.settings.serieNV, numero: 0, fecha: now.toISOString(), dia: U.today(now),
              cliente: cli, igvRate: S.settings.igv,
              items: cart.map(i => ({ ...i, total: U.r2(i.qty * i.precio) })),
              totales: t, pago: { metodo, recibido: rec, vuelto: U.r2(rec - t.total) },
              nota: el.querySelector('#nota').value.trim(), estado: 'emitida', cajaId: S.cash.id
            };
            try { await DB.createSale(sale); } catch (err) { return UI.toast('No se pudo guardar la venta: ' + err.message, 'error'); }
            cart = []; customer = null;
            close();
            S.products = await DB.all('products');
            pos.classList.remove('show-cart');
            renderCart(); renderGrid();
            UI.toast(`Venta ${U.docNum(sale)} registrada`);
            UI.showTicket(sale, { title: `Venta registrada · ${U.docNum(sale)}` });
          } }
        ]
      });
      const box = m.el, rec = box.querySelector('#rec'), vu = box.querySelector('#vu');
      const calc = () => { const r = U.num(rec.value); vu.textContent = U.money(r > t.total ? r - t.total : 0); };
      rec.addEventListener('input', calc);
      box.querySelectorAll('.quick button').forEach(b => b.onclick = () => { rec.value = U.r2(+b.dataset.v).toFixed(2); calc(); });
      box.querySelectorAll('#seg button').forEach(b => b.onclick = () => {
        metodo = b.dataset.m;
        box.querySelectorAll('#seg button').forEach(x => x.classList.toggle('on', x === b));
        box.querySelector('#cashbox').hidden = metodo !== 'efectivo';
        box.querySelector('#qrbox').hidden = !conQR(metodo);
        box.querySelector('footer .btn.primary').innerHTML = `${UI.icon('check')} ${conQR(metodo) ? 'Recibido' : 'Confirmar venta'}`;
      });

      // QR a pantalla completa, para girar el monitor o mostrar el celular al cliente. Un toque lo cierra.
      const enGrande = () => {
        const o = document.createElement('div');
        o.className = 'qrfull';
        o.innerHTML = `<div class="qrfull-card" role="dialog" aria-label="QR para pagar">
            <span>${U.esc(S.settings.nombreComercial || S.settings.razonSocial)}</span>
            <img src="${qrSrc}" alt="QR para pagar">
            <strong class="num">${U.money(t.total)}</strong>
            <p>Escanea con ${U.PAY[metodo]} y escribe este monto</p>
            <small>Toca la pantalla para volver</small>
          </div>`;
        const cerrar = e => { if (e.type === 'keydown' && e.key !== 'Escape') return; e.stopPropagation(); o.remove(); document.removeEventListener('keydown', cerrar, true); };
        o.onclick = cerrar;
        document.addEventListener('keydown', cerrar, true);
        document.body.appendChild(o);
      };
      box.querySelector('#qrzoom').onclick = enGrande;
      box.querySelector('#qrfull').onclick = enGrande;
      const aAjustes = box.querySelector('[data-close-modal]');
      if (aAjustes) aAjustes.onclick = () => m.close();
    }

    // Atajos de teclado (PC)
    const onKey = e => {
      if (document.querySelector('#modal-root .modal-wrap')) return;
      if (e.key === 'F2') { e.preventDefault(); q.focus(); q.select(); }
      if (e.key === 'F3') { e.preventDefault(); cat = cat === SIN_CODIGO ? '' : SIN_CODIGO; renderCats(); renderGrid(); }
      if (e.key === 'F9') { e.preventDefault(); checkout(); }
    };
    document.addEventListener('keydown', onKey);

    renderCats(); renderGrid(); renderCart();
    if (matchMedia('(min-width: 861px)').matches) q.focus();
    return () => document.removeEventListener('keydown', onKey);
  };
})();
