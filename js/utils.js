// Utilidades generales: dinero, fechas, impuestos, validaciones y archivos.
const U = {};

U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
U.r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
U.r3 = n => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
U.num = v => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

/** 1234.5 -> "1,234.50" */
U.fixed = n => {
  const [i, d] = U.r2(n).toFixed(2).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + d;
};
U.money = n => (U.r2(n) < 0 ? '−' : '') + 'S/ ' + U.fixed(Math.abs(n));
/** Cantidades: hasta 3 decimales, sin ceros sobrantes. */
U.qty = n => String(U.r3(n));

U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const z2 = n => String(n).padStart(2, '0');
/** Fecha local YYYY-MM-DD */
U.today = (d = new Date()) => `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}`;
U.addDays = (dia, n) => { const d = new Date(dia + 'T12:00:00'); d.setDate(d.getDate() + n); return U.today(d); };
U.fmtDateTime = iso => { const d = new Date(iso); return `${z2(d.getDate())}/${z2(d.getMonth() + 1)}/${d.getFullYear()} ${z2(d.getHours())}:${z2(d.getMinutes())}`; };
U.fmtDay = dia => { const [y, m, d] = dia.split('-'); return `${d}/${m}/${y}`; };
U.dayName = dia => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(dia + 'T12:00:00').getDay()];

U.pad = (n, l = 8) => String(n).padStart(l, '0');
U.docNum = s => `${s.serie}-${U.pad(s.numero)}`;

U.hue = str => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

// ---------- Impuestos ----------
/** Precios incluyen IGV. tipoIGV: 10 gravado, 20 exonerado, 30 inafecto (catálogo 07 SUNAT). */
U.calcTotals = (items, igvRate = 18) => {
  let grav = 0, exo = 0, ina = 0;
  for (const it of items) {
    const t = U.r2(it.qty * it.precio);
    if (it.tipoIGV === '20') exo += t; else if (it.tipoIGV === '30') ina += t; else grav += t;
  }
  grav = U.r2(grav);
  const base = U.r2(grav / (1 + igvRate / 100));
  return { gravada: base, exonerada: U.r2(exo), inafecta: U.r2(ina), igv: U.r2(grav - base), total: U.r2(grav + exo + ina) };
};

// ---------- Importe en letras ----------
(() => {
  const UN = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
    'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO',
    'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const c99 = n => n < 30 ? UN[n] : DEC[Math.floor(n / 10)] + (n % 10 ? ' Y ' + UN[n % 10] : '');
  const c999 = n => n === 100 ? 'CIEN' : [CEN[Math.floor(n / 100)], n % 100 ? c99(n % 100) : ''].filter(Boolean).join(' ');
  const apoc = s => s.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');
  const conv = n => {
    if (n < 1000) return c999(n);
    if (n < 1e6) {
      const m = Math.floor(n / 1000), r = n % 1000;
      return (m === 1 ? 'MIL' : apoc(conv(m)) + ' MIL') + (r ? ' ' + c999(r) : '');
    }
    const m = Math.floor(n / 1e6), r = n % 1e6;
    return (m === 1 ? 'UN MILLÓN' : apoc(conv(m)) + ' MILLONES') + (r ? ' ' + conv(r) : '');
  };
  U.letras = n => {
    const v = U.r2(n), ent = Math.floor(v), cent = Math.round((v - ent) * 100);
    return `${ent === 0 ? 'CERO' : conv(ent)} CON ${z2(cent)}/100 SOLES`;
  };
})();

// ---------- Documentos de identidad (catálogo 06 SUNAT) ----------
U.DOC_TYPES = { '0': 'Sin documento', '1': 'DNI', '6': 'RUC', '4': 'Carné de extranjería', '7': 'Pasaporte' };
U.validRUC = r => {
  if (!/^(10|15|16|17|20)\d{9}$/.test(r)) return false;
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 10; i++) s += +r[i] * w[i];
  let dv = 11 - (s % 11);
  if (dv === 10) dv = 0; else if (dv === 11) dv = 1;
  return dv === +r[10];
};
/** Devuelve un mensaje de error o '' si es válido. */
U.docError = (tipo, num) => {
  num = String(num || '').trim();
  if (tipo === '0') return '';
  if (!num) return 'Ingresa el número de documento';
  if (tipo === '1' && !/^\d{8}$/.test(num)) return 'El DNI debe tener 8 dígitos';
  if (tipo === '6' && !U.validRUC(num)) return 'El RUC no es válido (11 dígitos, revisa el número)';
  if ((tipo === '4' || tipo === '7') && !/^[A-Za-z0-9]{6,15}$/.test(num)) return 'Número de documento no válido';
  return '';
};

// ---------- Unidades (catálogo 03 SUNAT, las más usadas) ----------
U.UNITS = { NIU: 'Unidad', KGM: 'Kilogramo', LTR: 'Litro', MTR: 'Metro', BX: 'Caja', PK: 'Paquete', ZZ: 'Servicio' };
U.UNIT_SHORT = { NIU: 'und', KGM: 'kg', LTR: 'L', MTR: 'm', BX: 'caja', PK: 'paq', ZZ: 'serv' };
U.IGV_TYPES = { '10': 'Gravado (con IGV)', '20': 'Exonerado', '30': 'Inafecto' };
U.PAY = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

// ---------- Archivos ----------
U.download = (name, content, mime = 'text/plain') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
U.readFile = (file, as = 'text') => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  as === 'dataurl' ? r.readAsDataURL(file) : r.readAsText(file, 'utf-8');
});
U.pickFile = accept => new Promise(res => {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = accept; i.hidden = true;
  document.body.appendChild(i);
  i.onchange = () => { res(i.files[0] || null); i.remove(); };
  i.addEventListener('cancel', () => { res(null); i.remove(); });
  i.click();
});

/** Reduce una imagen para guardarla en la base local. Devuelve un data URL. */
U.shrinkImage = async (file, { max = 480, type = 'image/jpeg', quality = 0.82 } = {}) => {
  const url = await U.readFile(file, 'dataurl');
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL(type, quality));
    };
    img.onerror = () => rej(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
};

/** CSV con separador "," y BOM para que Excel lo abra con tildes. */
U.toCSV = rows => '﻿' + rows.map(r => r.map(v => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(',')).join('\r\n');

/** Lee CSV separado por "," o ";" (Excel en español usa ";"). */
U.parseCSV = text => {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
};
