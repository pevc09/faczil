// Caja: apertura, ingresos/egresos, cierre con arqueo e historial.
(() => {
  const V = Views.caja = {};

  V.openDialog = onDone => UI.modal({
    title: 'Abrir caja', size: 'sm',
    body: `<p class="muted">¿Con cuánto efectivo empiezas? (sencillo para dar vuelto)</p>
      <label class="field"><span>Monto inicial (S/)</span><input name="monto" inputmode="decimal" placeholder="0.00" autofocus></label>`,
    actions: [{ label: 'Cancelar' }, { label: `${UI.icon('unlock')} Abrir caja`, cls: 'primary', onClick: async ({ el, close }) => {
      const monto = U.r2(U.num(el.querySelector('[name=monto]').value));
      if (monto < 0) return UI.fieldError(el, 'monto', 'Monto no válido');
      if (App.state.cash) { close(); return onDone && onDone(); }
      const s = { id: U.uid(), estado: 'abierta', apertura: new Date().toISOString(), montoInicial: monto };
      await DB.put('cash_sessions', s);
      App.state.cash = s;
      close();
      UI.toast('Caja abierta');
      App.chrome();
      onDone && onDone();
    } }]
  });

  V.summary = async session => {
    const sales = await DB.byIndex('sales', 'cajaId', session.id);
    const movs = (await DB.byIndex('cash_movements', 'cajaId', session.id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ok = sales.filter(s => s.estado !== 'anulada');
    const porMetodo = {};
    ok.forEach(s => { porMetodo[s.pago.metodo] = U.r2((porMetodo[s.pago.metodo] || 0) + s.totales.total); });
    const sum = t => U.r2(movs.filter(m => m.tipo === t).reduce((a, m) => a + m.monto, 0));
    const ingresos = sum('ingreso'), egresos = sum('egreso');
    const totalVentas = U.r2(ok.reduce((a, s) => a + s.totales.total, 0));
    const esperado = U.r2(session.montoInicial + (porMetodo.efectivo || 0) + ingresos - egresos);
    return { movs, porMetodo, ingresos, egresos, totalVentas, esperado, nVentas: ok.length, anuladas: sales.length - ok.length };
  };

  const summaryHTML = (s, r) => `
    <div class="sum-grid">
      <div class="sum-line"><span>Monto inicial</span><span class="num">${U.money(s.montoInicial)}</span></div>
      ${Object.keys(U.PAY).map(k => `<div class="sum-line"><span>Ventas · ${U.PAY[k]}</span><span class="num">${U.money(r.porMetodo[k] || 0)}</span></div>`).join('')}
      <div class="sum-line"><span>Ingresos de efectivo</span><span class="num ok">+ ${U.money(r.ingresos)}</span></div>
      <div class="sum-line"><span>Egresos / gastos</span><span class="num bad">− ${U.money(r.egresos)}</span></div>
      <div class="sum-line strong"><span>Efectivo que debe haber</span><span class="num">${U.money(r.esperado)}</span></div>
      <div class="sum-line muted"><span>Total vendido (${r.nVentas} ventas${r.anuladas ? `, ${r.anuladas} anuladas` : ''})</span><span class="num">${U.money(r.totalVentas)}</span></div>
    </div>`;

  V.render = async el => {
    const S = App.state;
    const hist = (await DB.all('cash_sessions')).filter(s => s.estado === 'cerrada').sort((a, b) => b.apertura.localeCompare(a.apertura)).slice(0, 30);
    const histHTML = hist.length ? `<section class="card flush"><h2 class="pad-h">Cierres anteriores</h2><table class="table clickable">
        <thead><tr><th>Apertura</th><th class="hide-sm">Cierre</th><th class="r">Vendido</th><th class="r">Diferencia</th></tr></thead>
        <tbody>${hist.map(h => `<tr data-id="${h.id}"><td>${U.fmtDateTime(h.apertura)}</td><td class="hide-sm">${U.fmtDateTime(h.cierre)}</td>
          <td class="r num">${U.money(h.resumen.totalVentas)}</td>
          <td class="r num ${h.diferencia < 0 ? 'bad' : h.diferencia > 0 ? 'ok' : ''}">${h.diferencia > 0 ? '+' : ''}${U.money(h.diferencia)}</td></tr>`).join('')}</tbody></table></section>` : '';

    if (!S.cash) {
      el.innerHTML = `<div class="page-head"><div><h1>Caja</h1><p class="muted">Controla el efectivo del día</p></div></div>` +
        UI.empty('lock', 'La caja está cerrada', 'Ábrela al empezar el día con el sencillo que tienes. Al cerrar, FACZIL te dice cuánto efectivo debe haber.',
          `<button class="btn primary lg" id="open">${UI.icon('unlock')} Abrir caja</button>`) + histHTML;
      el.querySelector('#open').onclick = () => V.openDialog(() => App.render());
      bindHist();
      return;
    }

    const s = S.cash, r = await V.summary(s);
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Caja</h1><p class="muted"><span class="dot ok"></span> Abierta desde ${U.fmtDateTime(s.apertura)}</p></div>
        <div class="btn-row">
          <button class="btn" id="in">${UI.icon('arrowDown')} Ingreso</button>
          <button class="btn" id="out">${UI.icon('arrowUp')} Egreso</button>
          <button class="btn primary" id="close">${UI.icon('lock')} Cerrar caja</button>
        </div>
      </div>
      <div class="grid-2">
        <section class="card"><h2>Resumen del turno</h2>${summaryHTML(s, r)}</section>
        <section class="card"><h2>Movimientos de efectivo</h2>
          ${r.movs.length ? `<div class="mov-list">${r.movs.map(m => `<div class="mov"><span class="mov-ic ${m.tipo}">${UI.icon(m.tipo === 'ingreso' ? 'arrowDown' : 'arrowUp')}</span>
            <span class="grow"><strong>${U.esc(m.concepto)}</strong><small>${U.fmtDateTime(m.fecha)}</small></span>
            <span class="num ${m.tipo === 'ingreso' ? 'ok' : 'bad'}">${m.tipo === 'ingreso' ? '+' : '−'} ${U.money(m.monto)}</span></div>`).join('')}</div>`
            : '<p class="muted">Registra aquí pagos a proveedores, gastos, retiros o ingresos de efectivo que no sean ventas.</p>'}
        </section>
      </div>
      ${histHTML}`;
    const $ = x => el.querySelector(x);
    $('#in').onclick = () => movement('ingreso');
    $('#out').onclick = () => movement('egreso');
    $('#close').onclick = () => closeDialog(s, r);
    bindHist();

    function movement(tipo) {
      UI.modal({
        title: tipo === 'ingreso' ? 'Ingreso de efectivo' : 'Egreso / gasto', size: 'sm',
        body: `<label class="field"><span>Monto (S/)</span><input name="monto" inputmode="decimal" placeholder="0.00" autofocus></label>
          <label class="field"><span>Concepto</span><input name="concepto" maxlength="100" placeholder="${tipo === 'ingreso' ? 'Ej.: sencillo adicional' : 'Ej.: pago a proveedor de gaseosas'}"></label>`,
        actions: [{ label: 'Cancelar' }, { label: 'Registrar', cls: 'primary', onClick: async ({ el: m, close }) => {
          const d = UI.formData(m), monto = U.r2(U.num(d.monto));
          if (!(monto > 0)) return UI.fieldError(m, 'monto', 'Ingresa un monto');
          if (!d.concepto) return UI.fieldError(m, 'concepto', 'Indica el concepto');
          await DB.put('cash_movements', { id: U.uid(), cajaId: s.id, tipo, monto, concepto: d.concepto, fecha: new Date().toISOString() });
          close(); UI.toast('Movimiento registrado'); App.render();
        } }]
      });
    }

    function closeDialog(s, r) {
      const m = UI.modal({
        title: 'Cerrar caja',
        body: `${summaryHTML(s, r)}
          <label class="field"><span>Efectivo contado en caja (S/)</span><input name="contado" inputmode="decimal" placeholder="${r.esperado.toFixed(2)}" autofocus></label>
          <div class="diff" id="diff"></div>
          <label class="field"><span>Observación (opcional)</span><input name="obs" maxlength="140"></label>`,
        actions: [{ label: 'Cancelar' }, { label: `${UI.icon('lock')} Cerrar caja`, cls: 'primary', onClick: async ({ el: e, close }) => {
          const txt = e.querySelector('[name=contado]').value.trim();
          if (!txt) return UI.fieldError(e, 'contado', 'Cuenta el efectivo e ingresa el monto');
          const contado = U.r2(U.num(txt));
          const fresh = await V.summary(s);
          const done = { ...s, estado: 'cerrada', cierre: new Date().toISOString(), contado, esperado: fresh.esperado,
            diferencia: U.r2(contado - fresh.esperado), obs: e.querySelector('[name=obs]').value.trim(),
            resumen: { porMetodo: fresh.porMetodo, ingresos: fresh.ingresos, egresos: fresh.egresos, totalVentas: fresh.totalVentas, nVentas: fresh.nVentas, anuladas: fresh.anuladas } };
          await DB.put('cash_sessions', done);
          App.state.cash = null;
          close();
          UI.toast('Caja cerrada');
          await App.render();
          showClosed(done);
        } }]
      });
      const inp = m.el.querySelector('[name=contado]'), diff = m.el.querySelector('#diff');
      inp.addEventListener('input', () => {
        if (!inp.value.trim()) { diff.innerHTML = ''; return; }
        const d = U.r2(U.num(inp.value) - r.esperado);
        diff.className = 'diff ' + (d === 0 ? 'ok' : d < 0 ? 'bad' : 'warn');
        diff.textContent = d === 0 ? 'Cuadra exacto' : d < 0 ? `Falta ${U.money(-d)}` : `Sobra ${U.money(d)}`;
      });
    }

    function bindHist() {
      el.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => showClosed(hist.find(h => h.id === tr.dataset.id)));
    }
  };

  /** Texto del resumen del día para WhatsApp (los *asteriscos* salen en negrita). */
  V.resumenTexto = async h => {
    const S = App.state, c = S.settings, r = h.resumen;
    const ventas = (await DB.byIndex('sales', 'cajaId', h.id)).filter(s => s.estado !== 'anulada');
    const costo = new Map(S.products.map(p => [p.id, p.costo || 0]));
    const top = new Map();
    let ganancia = 0;
    ventas.forEach(s => s.items.forEach(i => {
      const k = i.productId || i.nombre, o = top.get(k) || { nombre: i.nombre, qty: 0 };
      o.qty += i.qty; top.set(k, o);
      if (costo.get(i.productId)) ganancia += i.qty * (i.precio - costo.get(i.productId));
    }));
    const masVendidos = [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const porReponer = S.products.filter(p => p.controlStock && p.stock <= p.stockMin).sort((a, b) => a.stock - b.stock).slice(0, 8);
    const metodos = Object.keys(U.PAY).filter(k => r.porMetodo[k]);
    const dif = h.diferencia === 0 ? 'Cuadra exacto ✅' : h.diferencia < 0 ? `Falta ${U.money(-h.diferencia)} ⚠️` : `Sobra ${U.money(h.diferencia)}`;
    return [
      `*Resumen del día — ${c.nombreComercial || c.razonSocial}*`,
      `Caja del ${U.fmtDateTime(h.apertura)} al ${U.fmtDateTime(h.cierre)}`,
      '',
      `*Vendido: ${U.money(r.totalVentas)}* en ${r.nVentas} ${r.nVentas === 1 ? 'venta' : 'ventas'}${r.anuladas ? ` (${r.anuladas} anuladas)` : ''}`,
      ...metodos.map(k => `• ${U.PAY[k]}: ${U.money(r.porMetodo[k])}`),
      ...(ganancia ? [`Ganancia estimada: ${U.money(ganancia)}`] : []),
      '',
      '*Efectivo en caja*',
      `Monto inicial: ${U.money(h.montoInicial)}`,
      ...(r.ingresos ? [`Ingresos: + ${U.money(r.ingresos)}`] : []),
      ...(r.egresos ? [`Egresos y gastos: − ${U.money(r.egresos)}`] : []),
      `Debe haber: ${U.money(h.esperado)}`,
      `Contado: ${U.money(h.contado)}`,
      `*${dif}*`,
      ...(masVendidos.length ? ['', '*Más vendidos*', ...masVendidos.map((t, k) => `${k + 1}. ${t.nombre} — ${U.qty(U.r3(t.qty))}`)] : []),
      ...(porReponer.length ? ['', '*Por reponer*', ...porReponer.map(p => `• ${p.nombre}: ${p.stock <= 0 ? 'agotado' : 'quedan ' + U.qty(p.stock)}`)] : []),
      ...(h.obs ? ['', `Obs.: ${h.obs}`] : []),
      '',
      '_Enviado desde FACZIL_'
    ].join('\n');
  };

  async function showClosed(h) {
    const r = { ...h.resumen, esperado: h.esperado };
    // El texto se prepara antes de mostrar el botón: así WhatsApp abre al instante, sin que el navegador lo bloquee.
    const texto = await V.resumenTexto(h);
    let tel = String(App.state.settings.whatsappResumen || '').replace(/\D/g, '');
    if (tel.length === 9) tel = '51' + tel;
    UI.modal({
      title: 'Cierre de caja',
      body: `<p class="muted">${U.fmtDateTime(h.apertura)} → ${U.fmtDateTime(h.cierre)}</p>
        ${summaryHTML(h, r)}
        <div class="sum-grid"><div class="sum-line strong"><span>Efectivo contado</span><span class="num">${U.money(h.contado)}</span></div>
        <div class="sum-line strong"><span>Diferencia</span><span class="num ${h.diferencia < 0 ? 'bad' : h.diferencia > 0 ? 'ok' : ''}">${h.diferencia > 0 ? '+' : ''}${U.money(h.diferencia)}</span></div></div>
        ${h.obs ? `<p class="hint">Obs.: ${U.esc(h.obs)}</p>` : ''}
        ${tel ? '' : '<p class="hint">Guarda tu celular en Ajustes para que el resumen vaya directo a tu WhatsApp. Sin número, eliges el contacto al enviar.</p>'}`,
      actions: [
        { label: 'Cerrar' },
        { label: `${UI.icon('chat')} Enviar resumen por WhatsApp`, cls: 'primary', onClick: () => { window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); } }
      ]
    });
  }
})();
