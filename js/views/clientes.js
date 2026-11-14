// Clientes: DNI / RUC con validación.
(() => {
  const V = Views.clientes = {};
  let q = '';

  V.label = c => c.numDoc ? `${c.numDoc} - ${c.nombre}` : c.nombre;

  V.render = el => {
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Clientes</h1><p class="muted" id="sum"></p></div>
        <button class="btn primary" id="new">${UI.icon('plus')} Nuevo cliente</button>
      </div>
      <div class="toolbar"><div class="searchbox">${UI.icon('search')}<input id="q" type="search" placeholder="Buscar por nombre, DNI o RUC" value="${U.esc(q)}"></div></div>
      <div id="list"></div>`;
    const $ = s => el.querySelector(s);
    $('#new').onclick = () => V.form(null, () => App.render());
    $('#q').oninput = e => { q = e.target.value; list(); };

    function list() {
      const all = App.state.customers;
      $('#sum').textContent = `${all.length} clientes registrados`;
      const v = q.trim().toLowerCase();
      const rows = all.filter(c => !v || c.nombre.toLowerCase().includes(v) || (c.numDoc || '').includes(v));
      if (!all.length) {
        $('#list').innerHTML = UI.empty('users', 'Sin clientes todavía', 'Las ventas sin cliente se registran como "Clientes varios". Registra clientes frecuentes o empresas que te piden factura.');
        return;
      }
      if (!rows.length) { $('#list').innerHTML = '<p class="muted pad">Sin resultados.</p>'; return; }
      $('#list').innerHTML = `<div class="card flush"><table class="table">
        <thead><tr><th>Cliente</th><th class="hide-sm">Teléfono</th><th></th></tr></thead>
        <tbody>${rows.map(c => `<tr data-id="${c.id}">
          <td><div class="cell-main">${U.esc(c.nombre)}</div><div class="cell-sub">${c.numDoc ? `${U.DOC_TYPES[c.tipoDoc]} ${U.esc(c.numDoc)}` : 'Sin documento'}${c.direccion ? ' · ' + U.esc(c.direccion) : ''}</div></td>
          <td class="hide-sm">${U.esc(c.telefono || '—')}</td>
          <td class="r actions"><button class="icon-btn" data-act="edit" aria-label="Editar">${UI.icon('edit')}</button><button class="icon-btn" data-act="del" aria-label="Eliminar">${UI.icon('trash')}</button></td>
        </tr>`).join('')}</tbody></table></div>`;
      $('#list').querySelectorAll('tr[data-id]').forEach(tr => {
        const c = all.find(x => x.id === tr.dataset.id);
        tr.onclick = async e => {
          if (e.target.closest('[data-act]')?.dataset.act === 'del') {
            if (!await UI.confirm(`¿Eliminar a "${c.nombre}"? Sus ventas anteriores se conservan.`, { ok: 'Eliminar', danger: true })) return;
            await DB.del('customers', c.id);
            App.state.customers = App.state.customers.filter(x => x.id !== c.id);
            UI.toast('Cliente eliminado');
            list();
          } else V.form(c, () => App.render());
        };
      });
    }
    list();
  };

  /** Formulario de cliente. prefill: datos iniciales para uno nuevo. */
  V.form = (c, onSaved, prefill = {}) => {
    const isNew = !c;
    c = c || { tipoDoc: '1', numDoc: '', nombre: '', direccion: '', telefono: '', email: '', ...prefill };
    UI.modal({
      title: isNew ? 'Nuevo cliente' : 'Editar cliente',
      body: `<div class="form">
        <div class="row2">
          <label class="field"><span>Documento</span><select name="tipoDoc">${Object.entries(U.DOC_TYPES).map(([k, v]) => `<option value="${k}" ${c.tipoDoc === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field"><span>Número</span><input name="numDoc" value="${U.esc(c.numDoc)}" maxlength="15" autofocus></label>
        </div>
        <label class="field"><span id="lbl-nombre">Nombre *</span><input name="nombre" value="${U.esc(c.nombre)}" maxlength="150"></label>
        <label class="field"><span>Dirección</span><input name="direccion" value="${U.esc(c.direccion)}" maxlength="200"></label>
        <div class="row2">
          <label class="field"><span>Celular (WhatsApp)</span><input name="telefono" inputmode="tel" value="${U.esc(c.telefono)}" maxlength="15"></label>
          <label class="field"><span>Correo</span><input name="email" type="email" value="${U.esc(c.email)}" maxlength="120"></label>
        </div>
      </div>`,
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', cls: 'primary', onClick: async ({ el, close }) => {
            const d = UI.formData(el);
            const err = U.docError(d.tipoDoc, d.numDoc);
            if (err) return UI.fieldError(el, 'numDoc', err);
            if (!d.nombre) return UI.fieldError(el, 'nombre', d.tipoDoc === '6' ? 'Ingresa la razón social' : 'Ingresa el nombre');
            if (d.tipoDoc === '0') d.numDoc = '';
            if (d.numDoc && App.state.customers.some(x => x.numDoc === d.numDoc && x.id !== c.id))
              return UI.fieldError(el, 'numDoc', 'Ya existe un cliente con este documento');
            const obj = { ...c, ...d, id: c.id || U.uid() };
            await DB.put('customers', obj);
            App.state.customers = [...App.state.customers.filter(x => x.id !== obj.id), obj].sort((a, b) => a.nombre.localeCompare(b.nombre));
            UI.toast(isNew ? 'Cliente registrado' : 'Cliente actualizado');
            close();
            onSaved && onSaved(obj);
          }
        }
      ]
    });
    const m = document.querySelector('#modal-root .modal-wrap:last-child');
    const sel = m.querySelector('[name=tipoDoc]'), num = m.querySelector('[name=numDoc]');
    const upd = () => {
      m.querySelector('#lbl-nombre').textContent = sel.value === '6' ? 'Razón social *' : 'Nombre *';
      num.disabled = sel.value === '0';
      num.inputMode = ['1', '6'].includes(sel.value) ? 'numeric' : 'text';
    };
    sel.addEventListener('change', upd);
    // Detecta el tipo según los dígitos
    num.addEventListener('input', () => {
      const v = num.value.trim();
      if (/^\d{11}$/.test(v) && sel.value === '1') { sel.value = '6'; upd(); }
    });
    upd();
  };
})();
