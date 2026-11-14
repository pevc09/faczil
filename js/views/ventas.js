// Historial de ventas: filtros, ver ticket, anular, exportar.
(() => {
  const V = Views.ventas = {};
  let desde = null, hasta = null, q = '';

  V.render = async el => {
    desde = desde || U.today(); hasta = hasta || U.today();
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Ventas</h1><p class="muted">Notas de venta emitidas</p></div>
        <button class="btn" id="exp">${UI.icon('download')} Exportar Excel (CSV)</button>
      </div>
      <div class="toolbar wrap">
        <label class="inline">Desde <input type="date" id="d1" value="${desde}"></label>
        <label class="inline">Hasta <input type="date" id="d2" value="${hasta}"></label>
        <div class="chips">
          <button class="chip" data-r="0">Hoy</button><button class="chip" data-r="1">Ayer</button>
          <button class="chip" data-r="7">7 días</button><button class="chip" data-r="30">30 días</button>
        </div>
        <div class="searchbox grow">${UI.icon('search')}<input id="q" type="search" placeholder="N° de venta o cliente" value="${U.esc(q)}"></div>
      </div>
      <div class="kpis" id="kpis"></div>
      <div id="list"></div>`;
    const $ = s => el.querySelector(s);
    let sales = [];

    async function load() {
      if (desde > hasta) [desde, hasta] = [hasta, desde];
      $('#d1').value = desde; $('#d2').value = hasta;
      sales = (await DB.byRange('sales', 'dia', desde, hasta)).sort((a, b) => b.fecha.localeCompare(a.fecha));
      draw();
    }
    function visible() {
      const v = q.trim().toLowerCase();
      return sales.filter(s => !v || U.docNum(s).toLowerCase().includes(v) || (s.cliente?.nombre || '').toLowerCase().includes(v) || (s.cliente?.numDoc || '').includes(v));
    }
    function draw() {
      const rows = visible();
      const ok = rows.filter(s => s.estado !== 'anulada');
      const total = ok.reduce((a, s) => a + s.totales.total, 0);
      $('#kpis').innerHTML = `
        <div class="kpi"><span>Total vendido</span><strong class="num">${U.money(total)}</strong></div>
        <div class="kpi"><span>Ventas</span><strong class="num">${ok.length}</strong></div>
        <div class="kpi"><span>Ticket promedio</span><strong class="num">${U.money(ok.length ? total / ok.length : 0)}</strong></div>
        <div class="kpi"><span>Anuladas</span><strong class="num">${rows.length - ok.length}</strong></div>`;
      if (!rows.length) { $('#list').innerHTML = UI.empty('receipt', 'Sin ventas en este periodo', 'Cambia las fechas o registra una venta desde la pantalla Vender.'); return; }
      $('#list').innerHTML = `<div class="card flush"><table class="table clickable">
        <thead><tr><th>Venta</th><th class="hide-sm">Cliente</th><th class="hide-sm">Pago</th><th class="r">Total</th></tr></thead>
        <tbody>${rows.map(s => `<tr data-id="${s.id}" class="${s.estado === 'anulada' ? 'void' : ''}">
          <td><div class="cell-main">${U.docNum(s)} ${s.estado === 'anulada' ? '<span class="tag bad">Anulada</span>' : ''}</div><div class="cell-sub">${U.fmtDateTime(s.fecha)}<span class="only-mobile"> · ${U.esc(s.cliente?.nombre || '')}</span></div></td>
          <td class="hide-sm">${U.esc(s.cliente?.nombre || '')}</td>
          <td class="hide-sm"><span class="tag">${U.PAY[s.pago.metodo] || s.pago.metodo}</span></td>
          <td class="r num strong">${U.money(s.totales.total)}</td>
        </tr>`).join('')}</tbody></table></div>`;
      $('#list').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => open(sales.find(s => s.id === tr.dataset.id)));
    }
    function open(sale) {
      const extra = sale.estado === 'anulada' ? [] : [{
        label: `${UI.icon('ban')} Anular`, cls: 'danger-ghost', onClick: ({ close }) => { close(); annul(sale); }
      }];
      const m = UI.showTicket(sale, { extra });
      if (sale.anulacion) m.el.querySelector('.modal-body').insertAdjacentHTML('afterbegin',
        `<div class="notice bad">${UI.icon('ban')} Anulada el ${U.fmtDateTime(sale.anulacion.fecha)}${sale.anulacion.motivo ? ': ' + U.esc(sale.anulacion.motivo) : ''}</div>`);
    }
    function annul(sale) {
      UI.modal({
        title: `Anular ${U.docNum(sale)}`, size: 'sm',
        body: `<p>La venta quedará anulada y el stock de los productos se devolverá al inventario.</p>
          <label class="field"><span>Motivo</span><input name="motivo" maxlength="120" placeholder="Ej.: error en el pedido"></label>`,
        actions: [{ label: 'Cancelar' }, { label: 'Anular venta', cls: 'danger', onClick: async ({ el, close }) => {
          const motivo = el.querySelector('[name=motivo]').value.trim();
          if (!motivo) return UI.fieldError(el, 'motivo', 'Indica el motivo');
          try { await DB.annulSale(sale.id, motivo); } catch (e) { return UI.toast(e.message, 'error'); }
          App.state.products = await DB.all('products');
          close(); UI.toast('Venta anulada'); load();
        } }]
      });
    }

    $('#d1').onchange = e => { desde = e.target.value || U.today(); load(); };
    $('#d2').onchange = e => { hasta = e.target.value || U.today(); load(); };
    $('#q').oninput = e => { q = e.target.value; draw(); };
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      const r = +b.dataset.r, t = U.today();
      if (r === 0) { desde = hasta = t; }
      else if (r === 1) { desde = hasta = U.addDays(t, -1); }
      else { desde = U.addDays(t, -(r - 1)); hasta = t; }
      load();
    });
    $('#exp').onclick = () => {
      const rows = [['fecha', 'hora', 'serie', 'numero', 'estado', 'tipo_doc_cliente', 'num_doc_cliente', 'cliente', 'medio_pago', 'op_gravada', 'op_exonerada', 'op_inafecta', 'igv', 'total']];
      visible().slice().reverse().forEach(s => {
        const d = new Date(s.fecha);
        rows.push([U.fmtDay(s.dia), d.toTimeString().slice(0, 5), s.serie, s.numero, s.estado, s.cliente?.tipoDoc || '0', s.cliente?.numDoc || '', s.cliente?.nombre || '',
          U.PAY[s.pago.metodo] || s.pago.metodo, s.totales.gravada.toFixed(2), s.totales.exonerada.toFixed(2), s.totales.inafecta.toFixed(2), s.totales.igv.toFixed(2), s.totales.total.toFixed(2)]);
      });
      U.download(`ventas-${desde}-a-${hasta}.csv`, U.toCSV(rows), 'text/csv');
    };
    await load();
  };
})();
