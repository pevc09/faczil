// Panel: resumen del día, últimos 7 días, más vendidos, stock bajo.
(() => {
  const V = Views.panel = {};

  V.render = async el => {
    const S = App.state, hoy = U.today(), desde = U.addDays(hoy, -6);
    const sales = (await DB.byRange('sales', 'dia', desde, hoy)).filter(s => s.estado !== 'anulada');
    const hoyS = sales.filter(s => s.dia === hoy);
    const totalHoy = hoyS.reduce((a, s) => a + s.totales.total, 0);
    const ayer = (await DB.byIndex('sales', 'dia', U.addDays(hoy, -1))).filter(s => s.estado !== 'anulada').reduce((a, s) => a + s.totales.total, 0);
    const costMap = new Map(S.products.map(p => [p.id, p.costo || 0]));
    const ganHoy = hoyS.reduce((a, s) => a + s.items.reduce((b, i) => b + (costMap.get(i.productId) ? i.qty * (i.precio - costMap.get(i.productId)) : 0), 0), 0);

    const days = Array.from({ length: 7 }, (_, k) => U.addDays(desde, k));
    const byDay = days.map(d => ({ d, t: U.r2(sales.filter(s => s.dia === d).reduce((a, s) => a + s.totales.total, 0)) }));
    const max = Math.max(1, ...byDay.map(x => x.t));

    const top = new Map();
    sales.forEach(s => s.items.forEach(i => {
      const k = i.productId || i.nombre, o = top.get(k) || { nombre: i.nombre, qty: 0, total: 0 };
      o.qty += i.qty; o.total += i.qty * i.precio; top.set(k, o);
    }));
    const topList = [...top.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    const low = S.products.filter(p => p.controlStock && p.stock <= p.stockMin).sort((a, b) => a.stock - b.stock).slice(0, 8);
    const s = S.settings;
    const firstRun = !S.products.length;
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const unidadesHoy = U.r3(hoyS.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0));

    el.innerHTML = `
      <div class="page-head">
        <div><h1>${saludo}</h1><p class="muted">${U.esc(s.nombreComercial || s.razonSocial)} · ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <a class="btn primary lg" href="#/vender">${UI.icon('cart')} Nueva venta</a>
      </div>
      ${firstRun ? `<section class="card onboard">
        <h2>Empieza en 3 pasos</h2>
        <ol>
          <li><a href="#/config">Completa los datos de tu negocio</a> (RUC, nombre, dirección) que salen en el ticket.</li>
          <li><a href="#/productos">Agrega tus productos</a> o impórtalos desde Excel. ¿Solo quieres probar? Ve a <a href="#/config">Ajustes → Cargar ejemplo</a>.</li>
          <li><a href="#/caja">Abre la caja</a> y registra tu primera venta.</li>
        </ol></section>` : ''}
      <div class="kpis">
        <div class="kpi hero"><span>Vendido hoy</span><strong class="num">${U.money(totalHoy)}</strong>
          <small>${ayer ? `${totalHoy >= ayer ? '▲' : '▼'} ${Math.abs(Math.round((totalHoy - ayer) / ayer * 100))}% vs. ayer (${U.money(ayer)})` : 'Sin ventas ayer para comparar'}</small>
          <img class="mascota" src="icons/mascota.svg" alt=""></div>
        <div class="kpi"><span>Ventas de hoy</span><strong class="num">${hoyS.length}</strong></div>
        <div class="kpi"><span>Productos vendidos hoy</span><strong class="num">${U.qty(unidadesHoy)}</strong></div>
        <div class="kpi"><span>Ticket promedio</span><strong class="num">${U.money(hoyS.length ? totalHoy / hoyS.length : 0)}</strong></div>
        <div class="kpi"><span>Ganancia estimada hoy</span><strong class="num">${U.money(ganHoy)}</strong><small>Según el costo registrado</small></div>
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Últimos 7 días</h2>
          <div class="bars" role="img" aria-label="Ventas de los últimos 7 días">
            ${byDay.map(x => `<div class="bar ${x.d === hoy ? 'today' : ''}" title="${U.fmtDay(x.d)}: ${U.money(x.t)}">
              <span class="bar-v num">${x.t ? U.fixed(x.t).replace(/\.00$/, '') : ''}</span>
              <span class="bar-f" style="height:${Math.max(2, x.t / max * 100)}%"></span>
              <span class="bar-l">${U.dayName(x.d)}</span></div>`).join('')}
          </div>
          <p class="hint">Total semana: <strong>${U.money(byDay.reduce((a, x) => a + x.t, 0))}</strong></p>
        </section>
        <section class="card">
          <h2>Más vendidos (7 días)</h2>
          ${topList.length ? `<div class="rank">${topList.map((t, k) => `<div class="rank-row"><span class="rank-n">${k + 1}</span><span class="grow">${U.esc(t.nombre)}<small>${U.qty(U.r3(t.qty))} vendidos</small></span><span class="num">${U.money(t.total)}</span></div>`).join('')}</div>`
            : '<p class="muted">Aún no hay ventas esta semana.</p>'}
        </section>
        <section class="card">
          <h2>Stock bajo ${low.length ? `<span class="tag warn">${low.length}</span>` : ''}</h2>
          ${low.length ? `<div class="rank">${low.map(p => `<a class="rank-row" href="#/productos"><span class="grow">${U.esc(p.nombre)}<small>Avisar en ${U.qty(p.stockMin)}</small></span><span class="stock ${p.stock <= 0 ? 'bad' : 'warn'}">${p.stock <= 0 ? 'Agotado' : U.qty(p.stock) + ' ' + (U.UNIT_SHORT[p.unidad] || '')}</span></a>`).join('')}</div>`
            : '<p class="muted">Todo en orden. Ningún producto bajo el mínimo.</p>'}
        </section>
        <section class="card">
          <h2>Caja</h2>
          ${S.cash ? `<p><span class="dot ok"></span> Abierta desde ${U.fmtDateTime(S.cash.apertura)} con ${U.money(S.cash.montoInicial)}.</p><a class="btn" href="#/caja">Ver caja</a>`
            : `<p><span class="dot"></span> La caja está cerrada.</p><a class="btn primary" href="#/caja">Abrir caja</a>`}
        </section>
      </div>`;
  };
})();
