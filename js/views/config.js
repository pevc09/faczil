// Ajustes: datos de la empresa, ticket, respaldo de datos.
(() => {
  const V = Views.config = {};

  V.render = async el => {
    const c = App.state.settings;
    const next = await DB.nextNumber(c.serieNV);
    el.innerHTML = `
      <div class="page-head"><div><h1>Ajustes</h1><p class="muted">Datos de tu negocio, ticket y respaldo de información.</p></div></div>
      <div class="grid-2">
        <section class="card">
          <h2>Mi negocio</h2>
          <div class="form" id="f-emp">
            <label class="field"><span>RUC</span><input name="ruc" inputmode="numeric" maxlength="11" value="${U.esc(c.ruc)}" placeholder="20xxxxxxxxx"></label>
            <label class="field"><span>Razón social *</span><input name="razonSocial" value="${U.esc(c.razonSocial)}"></label>
            <label class="field"><span>Nombre comercial</span><input name="nombreComercial" value="${U.esc(c.nombreComercial)}" placeholder="Como te conocen tus clientes"></label>
            <label class="field"><span>Dirección</span><input name="direccion" value="${U.esc(c.direccion)}"></label>
            <div class="row2">
              <label class="field"><span>Teléfono</span><input name="telefono" inputmode="tel" value="${U.esc(c.telefono)}"></label>
              <label class="field"><span>Correo</span><input name="email" type="email" value="${U.esc(c.email)}"></label>
            </div>
            <div class="field"><span>Logo (opcional)</span>
              <div class="logo-row">
                <div class="logo-box" id="logo-box">${c.logo ? `<img src="${c.logo}" alt="Logo">` : '<small class="muted">Sin logo</small>'}</div>
                <button class="btn sm" id="logo-up" type="button">${UI.icon('upload')} Subir</button>
                <button class="btn sm ghost" id="logo-del" type="button" ${c.logo ? '' : 'hidden'}>Quitar</button>
              </div>
            </div>
          </div>
        </section>
        <section class="card">
          <h2>Ventas y ticket</h2>
          <div class="form" id="f-ven">
            <div class="row2">
              <label class="field"><span>Serie nota de venta</span><input name="serieNV" maxlength="4" value="${U.esc(c.serieNV)}"></label>
              <label class="field"><span>IGV (%)</span><input name="igv" inputmode="decimal" value="${c.igv}"></label>
            </div>
            <p class="hint">Siguiente número: <strong>${U.esc(c.serieNV)}-${U.pad(next)}</strong>. Los precios de tus productos incluyen IGV.</p>
            <label class="field"><span>Ancho del papel</span>
              <select name="ticketAncho"><option value="80" ${c.ticketAncho == 80 ? 'selected' : ''}>80 mm (estándar)</option><option value="58" ${c.ticketAncho == 58 ? 'selected' : ''}>58 mm (portátil)</option></select>
            </label>
            <label class="field"><span>Mensaje al pie del ticket</span><input name="pie" maxlength="120" value="${U.esc(c.pie)}"></label>
            <label class="field"><span>WhatsApp para el resumen del día</span><input name="whatsappResumen" inputmode="tel" maxlength="15" value="${U.esc(c.whatsappResumen || '')}" placeholder="Ej.: 987654321"></label>
            <p class="hint">Al cerrar la caja, FACZIL deja el resumen escrito en WhatsApp para este número. Tú solo pulsas enviar.</p>
          </div>
          <button class="btn primary block" id="save">${UI.icon('check')} Guardar ajustes</button>
        </section>
        <section class="card">
          <h2>Cobro con Yape y Plin</h2>
          <p class="muted">Sube la imagen de tu QR (en la app de Izipay está en "Mi QR"). FACZIL la muestra junto al monto cuando cobras con Yape o Plin.</p>
          <div class="qr-row">
            <div class="qr-box" id="qr-box"><img src="${c.qrYape || 'icons/qr-ejemplo.svg'}" alt="${c.qrYape ? 'Tu QR de cobro' : 'QR de ejemplo'}"></div>
            <div class="btn-col">
              <button class="btn" id="qr-up" type="button">${UI.icon('upload')} ${c.qrYape ? 'Cambiar QR' : 'Subir mi QR'}</button>
              <button class="btn ghost" id="qr-del" type="button" ${c.qrYape ? '' : 'hidden'}>Quitar</button>
              <small class="muted" id="qr-estado">${c.qrYape ? 'Tu QR está guardado.' : 'Ahora se muestra un QR de ejemplo: no sirve para cobrar.'}</small>
            </div>
          </div>
        </section>
        <section class="card">
          <h2>Respaldo de datos</h2>
          <p class="muted">Tus datos se guardan en este dispositivo. Descarga un respaldo con frecuencia y guárdalo en Drive o en tu correo.</p>
          <div class="btn-row">
            <button class="btn" id="bk-down">${UI.icon('download')} Descargar respaldo</button>
            <button class="btn" id="bk-up">${UI.icon('upload')} Restaurar respaldo</button>
          </div>
        </section>
        <section class="card">
          <h2>Datos de prueba</h2>
          <p class="muted">Carga productos y clientes de ejemplo para practicar, o borra todo para empezar de cero.</p>
          <div class="btn-row">
            <button class="btn" id="demo">Cargar ejemplo</button>
            <button class="btn danger-ghost" id="wipe">${UI.icon('trash')} Borrar todo</button>
          </div>
        </section>
      </div>`;

    const $ = s => el.querySelector(s);
    let logo = c.logo;

    $('#logo-up').onclick = async () => {
      const f = await U.pickFile('image/*');
      if (!f) return;
      try { logo = await U.shrinkImage(f, { max: 320, type: 'image/png' }); } catch (e) { return UI.toast(e.message, 'error'); }
      $('#logo-box').innerHTML = `<img src="${logo}" alt="Logo">`;
      $('#logo-del').hidden = false;
    };
    $('#logo-del').onclick = () => { logo = ''; $('#logo-box').innerHTML = '<small class="muted">Sin logo</small>'; $('#logo-del').hidden = true; };

    // El QR se guarda al instante, sin esperar al botón "Guardar ajustes".
    const guardarQR = async qrYape => {
      const cfg = { ...App.state.settings, qrYape };
      await DB.setConfig(cfg);
      App.state.settings = cfg;
      $('#qr-box').innerHTML = `<img src="${qrYape || 'icons/qr-ejemplo.svg'}" alt="${qrYape ? 'Tu QR de cobro' : 'QR de ejemplo'}">`;
      $('#qr-del').hidden = !qrYape;
      $('#qr-up').innerHTML = `${UI.icon('upload')} ${qrYape ? 'Cambiar QR' : 'Subir mi QR'}`;
      $('#qr-estado').textContent = qrYape ? 'Tu QR está guardado.' : 'Ahora se muestra un QR de ejemplo: no sirve para cobrar.';
    };
    $('#qr-up').onclick = async () => {
      const f = await U.pickFile('image/*');
      if (!f) return;
      try { await guardarQR(await U.shrinkImage(f, { max: 720, type: 'image/png' })); UI.toast('QR guardado'); }
      catch (e) { UI.toast(e.message, 'error'); }
    };
    $('#qr-del').onclick = async () => { await guardarQR(''); UI.toast('QR quitado'); };

    $('#save').onclick = async () => {
      const d = { ...UI.formData($('#f-emp')), ...UI.formData($('#f-ven')) };
      if (d.ruc && !U.validRUC(d.ruc)) return UI.fieldError(el, 'ruc', 'El RUC no es válido');
      if (!d.razonSocial) return UI.fieldError(el, 'razonSocial', 'Ingresa la razón social');
      d.serieNV = d.serieNV.toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(d.serieNV)) return UI.fieldError(el, 'serieNV', 'La serie debe tener 4 caracteres, ej. NV01');
      d.igv = U.num(d.igv);
      if (d.igv < 0 || d.igv > 30) return UI.fieldError(el, 'igv', 'Revisa el porcentaje de IGV');
      d.ticketAncho = +d.ticketAncho;
      d.whatsappResumen = (d.whatsappResumen || '').replace(/\D/g, '');
      if (d.whatsappResumen && (d.whatsappResumen.length < 9 || (d.whatsappResumen.length === 9 && d.whatsappResumen[0] !== '9')))
        return UI.fieldError(el, 'whatsappResumen', 'Escribe el celular de 9 dígitos, ej. 987654321');
      const cfg = { ...App.state.settings, ...d, logo };   // parte de lo guardado ahora, para no pisar el QR
      await DB.setConfig(cfg);
      App.state.settings = cfg;
      UI.toast('Ajustes guardados');
      App.render();
    };

    $('#bk-down').onclick = async () => {
      const data = await DB.exportAll();
      U.download(`faczil-respaldo-${U.today()}.json`, JSON.stringify(data), 'application/json');
    };
    $('#bk-up').onclick = async () => {
      const f = await U.pickFile('.json,application/json');
      if (!f) return;
      let json;
      try { json = JSON.parse(await U.readFile(f)); } catch { return UI.toast('El archivo no se pudo leer', 'error'); }
      if (!await UI.confirm('Se reemplazarán TODOS los datos actuales por los del respaldo. ¿Continuar?', { ok: 'Restaurar', danger: true })) return;
      try { await DB.importAll(json); } catch (e) { return UI.toast(e.message, 'error'); }
      UI.toast('Respaldo restaurado');
      App.reload();
    };
    $('#demo').onclick = async () => {
      if (!await UI.confirm('Se agregarán productos y clientes de ejemplo.', { ok: 'Cargar' })) return;
      await loadDemo();
      UI.toast('Datos de ejemplo cargados');
      App.reload();
    };
    $('#wipe').onclick = async () => {
      if (!await UI.confirm('Se borrarán productos, clientes, ventas, caja y ajustes de este dispositivo. No se puede deshacer. Descarga un respaldo antes si lo necesitas.', { title: 'Borrar todo', ok: 'Borrar todo', danger: true })) return;
      await DB.clearAll();
      UI.toast('Datos borrados');
      App.reload();
    };
  };

  function demoRUC(base10) {
    const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += +base10[i] * w[i];
    let dv = 11 - (s % 11); if (dv === 10) dv = 0; else if (dv === 11) dv = 1;
    return base10 + dv;
  }

  async function loadDemo() {
    const P = (codigo, nombre, categoria, precio, costo, stock, unidad = 'NIU', tipoIGV = '10') => ({
      id: U.uid(), codigo, nombre, categoria, unidad, precio, costo, tipoIGV, controlStock: unidad !== 'ZZ',
      stock: unidad === 'ZZ' ? 0 : stock, stockMin: 5, creado: new Date().toISOString()
    });
    await DB.putMany('products', [
      P('7750001', 'Gaseosa 500 ml', 'Bebidas', 2.5, 1.6, 48),
      P('7750002', 'Agua mineral 625 ml', 'Bebidas', 1.5, 0.8, 60),
      P('7750003', 'Jugo de naranja 1 L', 'Bebidas', 5.9, 3.9, 12),
      P('7750010', 'Arroz extra 1 kg', 'Abarrotes', 4.8, 3.9, 40, 'KGM', '20'),
      P('7750011', 'Azúcar rubia 1 kg', 'Abarrotes', 4.2, 3.4, 30),
      P('7750012', 'Aceite vegetal 1 L', 'Abarrotes', 9.9, 7.8, 18),
      P('7750013', 'Fideos tallarín 500 g', 'Abarrotes', 3.6, 2.6, 25),
      P('7750014', 'Leche evaporada 400 g', 'Lácteos', 4.1, 3.3, 36),
      P('7750015', 'Yogurt fresa 1 L', 'Lácteos', 7.5, 5.6, 4),
      P('7750020', 'Galletas de soda x6', 'Snacks', 3.2, 2.2, 20),
      P('7750021', 'Papas fritas 150 g', 'Snacks', 5.5, 3.8, 3),
      P('7750030', 'Detergente 900 g', 'Limpieza', 11.9, 9.1, 10),
      P('7750031', 'Papel higiénico x4', 'Limpieza', 6.9, 5.2, 15),
      P('7750040', 'Pan francés', 'Panadería', 0.3, 0.18, 0, 'NIU', '20'),
      P('SERV01', 'Delivery', 'Servicios', 5, 0, 0, 'ZZ')
    ].map(p => (p.codigo === '7750040' ? { ...p, controlStock: false } : p)));
    await DB.putMany('customers', [
      { id: U.uid(), tipoDoc: '1', numDoc: '45678912', nombre: 'María Quispe Huamán', direccion: 'Av. Los Olivos 123, Lima', telefono: '987654321', email: '' },
      { id: U.uid(), tipoDoc: '6', numDoc: demoRUC('2060123456'), nombre: 'Inversiones Demo S.A.C.', direccion: 'Jr. Comercio 456, Arequipa', telefono: '', email: 'compras@demo.pe' },
      { id: U.uid(), tipoDoc: '1', numDoc: '70123456', nombre: 'José Mamani Flores', direccion: '', telefono: '912345678', email: '' }
    ]);
  }
})();
