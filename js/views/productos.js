// Productos e inventario: alta, edición, stock, importar/exportar CSV.
(() => {
  const V = Views.productos = {};
  let q = '', filtro = '';

  V.render = el => {
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Productos</h1><p class="muted" id="sum"></p></div>
        <div class="btn-row">
          <button class="btn" id="imp">${UI.icon('upload')} <span class="hide-sm">Importar</span></button>
          <button class="btn" id="exp">${UI.icon('download')} <span class="hide-sm">Exportar</span></button>
          <button class="btn primary" id="new">${UI.icon('plus')} Nuevo</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="searchbox">${UI.icon('search')}<input id="q" type="search" placeholder="Buscar por nombre, código o categoría" value="${U.esc(q)}"></div>
        <select id="filtro" aria-label="Filtrar">
          <option value="">Todos</option><option value="bajo">Stock bajo</option><option value="sin">Sin stock</option>
        </select>
      </div>
      <div id="list"></div>`;
    const $ = s => el.querySelector(s);
    $('#filtro').value = filtro;
    $('#q').oninput = e => { q = e.target.value; list(); };
    $('#filtro').onchange = e => { filtro = e.target.value; list(); };
    $('#new').onclick = () => V.form(null, () => App.render());
    $('#exp').onclick = exportCSV;
    $('#imp').onclick = importCSV;

    function list() {
      const all = App.state.products;
      const v = q.trim().toLowerCase();
      const rows = all.filter(p =>
        (!v || p.nombre.toLowerCase().includes(v) || (p.codigo || '').toLowerCase().includes(v) || (p.categoria || '').toLowerCase().includes(v)) &&
        (!filtro || (p.controlStock && (filtro === 'sin' ? p.stock <= 0 : p.stock <= p.stockMin)))
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));
      const valor = all.filter(p => p.controlStock && p.stock > 0).reduce((a, p) => a + p.stock * (p.costo || 0), 0);
      $('#sum').textContent = `${all.length} productos · Inventario valorizado al costo: ${U.money(valor)}`;
      if (!all.length) {
        $('#list').innerHTML = UI.empty('box', 'Agrega tu primer producto', 'Registra lo que vendes con su precio y stock. También puedes importar una lista desde Excel (CSV) o cargar datos de ejemplo en Ajustes.');
        return;
      }
      if (!rows.length) { $('#list').innerHTML = '<p class="muted pad">Sin resultados.</p>'; return; }
      $('#list').innerHTML = `<div class="card flush"><table class="table">
        <thead><tr><th>Producto</th><th class="hide-sm">Categoría</th><th class="r">Precio</th><th class="r">Stock</th><th></th></tr></thead>
        <tbody>${rows.map(p => {
          const st = !p.controlStock ? '<span class="muted">—</span>'
            : `<span class="stock ${p.stock <= 0 ? 'bad' : p.stock <= p.stockMin ? 'warn' : ''}">${U.qty(p.stock)} ${U.UNIT_SHORT[p.unidad] || ''}</span>`;
          return `<tr data-id="${p.id}">
            <td><div class="cell-prod">${UI.thumb(p)}<div><div class="cell-main">${U.esc(p.nombre)}</div><div class="cell-sub">${U.esc(p.codigo || 'Sin código')}${p.tipoIGV !== '10' ? ' · ' + U.IGV_TYPES[p.tipoIGV] : ''}</div></div></div></td>
            <td class="hide-sm">${U.esc(p.categoria || '—')}</td>
            <td class="r num">${U.money(p.precio)}</td>
            <td class="r">${st}</td>
            <td class="r actions"><button class="icon-btn" data-act="edit" aria-label="Editar">${UI.icon('edit')}</button><button class="icon-btn" data-act="del" aria-label="Eliminar">${UI.icon('trash')}</button></td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
      $('#list').querySelectorAll('tr[data-id]').forEach(tr => {
        const p = all.find(x => x.id === tr.dataset.id);
        tr.onclick = async e => {
          const act = e.target.closest('[data-act]')?.dataset.act;
          if (act === 'del') {
            if (!await UI.confirm(`¿Eliminar "${p.nombre}"? Las ventas anteriores no se modifican.`, { ok: 'Eliminar', danger: true })) return;
            await DB.del('products', p.id);
            App.state.products = App.state.products.filter(x => x.id !== p.id);
            UI.toast('Producto eliminado');
            list();
          } else V.form(p, () => App.render());
        };
      });
    }
    list();
  };

  /** Formulario de producto (nuevo o edición). */
  V.form = (p, onSaved) => {
    const isNew = !p;
    p = p || { codigo: '', nombre: '', categoria: '', unidad: 'NIU', precio: '', costo: '', tipoIGV: '10', controlStock: true, stock: 0, stockMin: 5 };
    const cats = [...new Set(App.state.products.map(x => x.categoria).filter(Boolean))].sort();
    let imagen = p.imagen || '';
    UI.modal({
      title: isNew ? 'Nuevo producto' : 'Editar producto',
      body: `<div class="form">
        <div class="field"><span>Foto del producto</span>
          <div class="logo-row">
            <div class="photo-box" id="photo-box"></div>
            <button class="btn sm" id="photo-up" type="button">${UI.icon('camera')} Subir o tomar foto</button>
            <button class="btn sm ghost" id="photo-del" type="button">Quitar</button>
          </div>
        </div>
        <label class="field"><span>Nombre *</span><input name="nombre" value="${U.esc(p.nombre)}" maxlength="120" autofocus></label>
        <div class="row2">
          <label class="field"><span>Código / código de barras</span><input name="codigo" value="${U.esc(p.codigo)}" maxlength="40"></label>
          <label class="field"><span>Categoría</span><input name="categoria" list="cat-list" value="${U.esc(p.categoria)}" maxlength="40"><datalist id="cat-list">${cats.map(c => `<option value="${U.esc(c)}">`).join('')}</datalist></label>
        </div>
        <div class="row2">
          <label class="field"><span>Precio de venta (con IGV) *</span><input name="precio" inputmode="decimal" value="${p.precio === '' ? '' : U.r2(p.precio).toFixed(2)}" placeholder="0.00"></label>
          <label class="field"><span>Costo (opcional)</span><input name="costo" inputmode="decimal" value="${p.costo === '' || p.costo == null ? '' : U.r2(p.costo).toFixed(2)}" placeholder="0.00"></label>
        </div>
        <p class="hint" id="margin"></p>
        <div class="row2">
          <label class="field"><span>Unidad</span><select name="unidad">${Object.entries(U.UNITS).map(([k, v]) => `<option value="${k}" ${p.unidad === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field"><span>Impuesto</span><select name="tipoIGV">${Object.entries(U.IGV_TYPES).map(([k, v]) => `<option value="${k}" ${p.tipoIGV === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <label class="check"><input type="checkbox" name="controlStock" ${p.controlStock ? 'checked' : ''}> Controlar stock de este producto</label>
        <div class="row2" id="stock-row">
          <label class="field"><span>Stock actual</span><input name="stock" inputmode="decimal" value="${U.qty(p.stock || 0)}"></label>
          <label class="field"><span>Avisar cuando quede</span><input name="stockMin" inputmode="decimal" value="${U.qty(p.stockMin || 0)}"></label>
        </div>
      </div>`,
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', cls: 'primary', onClick: async ({ el, close }) => {
            const d = UI.formData(el);
            if (!d.nombre) return UI.fieldError(el, 'nombre', 'Ingresa el nombre');
            const precio = U.num(d.precio);
            if (!(precio > 0)) return UI.fieldError(el, 'precio', 'Ingresa un precio mayor a 0');
            if (d.codigo && App.state.products.some(x => x.codigo === d.codigo && x.id !== p.id))
              return UI.fieldError(el, 'codigo', 'Ya existe un producto con este código');
            const obj = {
              ...p, id: p.id || U.uid(), imagen, nombre: d.nombre, codigo: d.codigo, categoria: d.categoria,
              precio: U.r2(precio), costo: U.r2(U.num(d.costo)), unidad: d.unidad, tipoIGV: d.tipoIGV,
              controlStock: d.controlStock, stock: U.r3(U.num(d.stock)), stockMin: U.r3(U.num(d.stockMin)),
              creado: p.creado || new Date().toISOString(), actualizado: new Date().toISOString()
            };
            await DB.put('products', obj);
            const list = App.state.products.filter(x => x.id !== obj.id);
            list.push(obj);
            App.state.products = list;
            UI.toast(isNew ? 'Producto creado' : 'Producto actualizado');
            close();
            onSaved && onSaved(obj);
          }
        }
      ]
    });
    const m = document.querySelector('#modal-root .modal-wrap:last-child');
    const upd = () => {
      const pr = U.num(m.querySelector('[name=precio]').value), co = U.num(m.querySelector('[name=costo]').value);
      m.querySelector('#margin').textContent = pr > 0 && co > 0 ? `Ganancia por unidad: ${U.money(pr - co)} (${Math.round((pr - co) / pr * 100)}% del precio)` : '';
      m.querySelector('#stock-row').hidden = !m.querySelector('[name=controlStock]').checked;
    };
    m.querySelectorAll('[name=precio],[name=costo],[name=controlStock]').forEach(i => i.addEventListener('input', upd));
    upd();
    const photo = () => {
      m.querySelector('#photo-box').innerHTML = imagen ? `<img src="${imagen}" alt="Foto del producto">` : UI.icon('camera');
      m.querySelector('#photo-del').hidden = !imagen;
    };
    m.querySelector('#photo-up').onclick = async () => {
      const f = await U.pickFile('image/*');
      if (!f) return;
      try { imagen = await U.shrinkImage(f); } catch (e) { return UI.toast(e.message, 'error'); }
      photo();
    };
    m.querySelector('#photo-del').onclick = () => { imagen = ''; photo(); };
    photo();
  };

  const HEAD = ['codigo', 'nombre', 'categoria', 'unidad', 'precio', 'costo', 'stock', 'stock_minimo', 'impuesto'];

  function exportCSV() {
    const rows = [HEAD, ...App.state.products.map(p => [p.codigo, p.nombre, p.categoria, p.unidad, p.precio.toFixed(2), (p.costo || 0).toFixed(2),
      p.controlStock ? p.stock : '', p.controlStock ? p.stockMin : '', p.tipoIGV])];
    U.download(`productos-${U.today()}.csv`, U.toCSV(rows), 'text/csv');
  }

  async function importCSV() {
    UI.modal({
      title: 'Importar productos',
      body: `<p>Sube un archivo <strong>CSV</strong> (en Excel: Guardar como → CSV). La primera fila debe tener estos encabezados:</p>
        <pre class="code">${HEAD.join(',')}</pre>
        <ul class="hint-list">
          <li><strong>nombre</strong> y <strong>precio</strong> son obligatorios. El precio incluye IGV.</li>
          <li><strong>unidad</strong>: ${Object.keys(U.UNITS).join(', ')} (por defecto NIU = unidad).</li>
          <li><strong>impuesto</strong>: 10 gravado, 20 exonerado, 30 inafecto (por defecto 10).</li>
          <li>Si el <strong>código</strong> ya existe, el producto se actualiza.</li>
          <li>Deja <strong>stock</strong> vacío para no controlar stock.</li>
        </ul>`,
      actions: [
        { label: `${UI.icon('download')} Descargar plantilla`, onClick: () => U.download('plantilla-productos.csv', U.toCSV([HEAD, ['7750001', 'Gaseosa 500 ml', 'Bebidas', 'NIU', '2.50', '1.60', '48', '5', '10']]), 'text/csv') },
        { label: `${UI.icon('upload')} Elegir archivo`, cls: 'primary', onClick: async ({ close }) => {
          const f = await U.pickFile('.csv,text/csv');
          if (!f) return;
          const rows = U.parseCSV(await U.readFile(f));
          const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
          const ix = k => head.indexOf(k);
          if (ix('nombre') < 0 || ix('precio') < 0) return UI.toast('Faltan las columnas "nombre" y "precio"', 'error');
          const byCode = new Map(App.state.products.filter(p => p.codigo).map(p => [p.codigo, p]));
          let ok = 0, skip = 0; const out = [];
          for (const r of rows) {
            const g = k => ix(k) >= 0 ? (r[ix(k)] || '').trim() : '';
            const nombre = g('nombre'), precio = U.num(g('precio'));
            if (!nombre || !(precio > 0)) { skip++; continue; }
            const codigo = g('codigo'), prev = codigo && byCode.get(codigo);
            const stockTxt = g('stock'), unidad = U.UNITS[g('unidad').toUpperCase()] ? g('unidad').toUpperCase() : 'NIU';
            const tipo = ['10', '20', '30'].includes(g('impuesto')) ? g('impuesto') : '10';
            const p = {
              ...(prev || {}), id: prev ? prev.id : U.uid(), codigo, nombre, categoria: g('categoria'), unidad, precio: U.r2(precio),
              costo: U.r2(U.num(g('costo'))), tipoIGV: tipo, controlStock: stockTxt !== '', stock: U.r3(U.num(stockTxt)),
              stockMin: U.r3(U.num(g('stock_minimo'))), creado: prev ? prev.creado : new Date().toISOString(), actualizado: new Date().toISOString()
            };
            if (codigo) byCode.set(codigo, p);
            out.push(p); ok++;
          }
          await DB.putMany('products', out);
          close();
          UI.toast(`${ok} productos importados${skip ? `, ${skip} filas omitidas` : ''}`, skip ? 'warn' : 'ok');
          App.reload();
        } }
      ]
    });
  }
})();
