# FACZIL — Fase 1

Punto de venta para negocios en Perú. Funciona en PC y celular y se puede instalar como app. No necesita internet para vender.

## Qué incluye
- **Vender**: catálogo con búsqueda, lector de código de barras (escanea y presiona Enter), categorías, carrito con cantidades y precios editables, cliente, cobro con efectivo (vuelto automático), Yape, Plin, tarjeta o transferencia.
- **Nota de venta** con correlativo (NV01-00000001), IGV calculado (gravado / exonerado / inafecto), importe en letras, ticket de 80 mm o 58 mm, impresión y envío por WhatsApp.
- **Ventas**: historial por fechas, anulación con motivo (devuelve el stock) y exportación a Excel (CSV) para el contador.
- **Productos**: foto (se sube o se toma con la cámara del celular y se reduce sola), precio, costo, ganancia, stock, aviso de stock bajo, unidades SUNAT, importar y exportar desde Excel (CSV).
- **Clientes**: DNI, RUC (valida el dígito verificador), carné de extranjería y pasaporte.
- **Caja**: apertura, ingresos y egresos, cierre con arqueo (cuánto debe haber, cuánto falta o sobra) e historial.
- **Panel**: ventas del día, comparación con ayer, ganancia estimada, gráfico de 7 días, más vendidos y stock bajo.
- **Respaldo**: descargar y restaurar todos los datos (archivo .json).

## Cómo abrirla
- **Como programa en esta PC**: doble clic en el icono **FACZIL** del escritorio. Abre en su propia ventana y no necesita internet. El acceso directo ejecuta `FACZIL.ps1`, que sirve la app solo para esta PC y se apaga al cerrar la ventana. Necesita Microsoft Edge o Google Chrome.
- **En el celular**: hay que publicar la carpeta en un hosting gratuito con HTTPS (por ejemplo GitHub Pages, Netlify o Cloudflare Pages). Después, en el celular aparece "Agregar a pantalla principal".

## Importante
- Los datos del programa de PC viven en la subcarpeta **`datos`**. Si la borras o mueves el programa sin ella, pierdes ventas e inventario.
- En esta fase los datos se guardan **en cada dispositivo** (no se comparten entre la PC y el celular). Descarga respaldos con frecuencia en Ajustes.
- La **nota de venta** es un documento interno: todavía no se envía a SUNAT. Eso llega en la Fase 2 (boletas, facturas y notas electrónicas).

## Atajos en PC
- **F2**: buscar producto
- **F3**: apartado "Sin código" (productos que no se escanean, ordenados por lo que más se vende)
- **F9**: cobrar
- **Enter**: en la búsqueda agrega el producto; en una ventana confirma la acción.

## Próximas fases
2. Boletas, facturas y notas de crédito/débito electrónicas a SUNAT mediante un proveedor OSE/PSE, comunicación de baja y consulta de RUC/DNI.
3. Datos en la nube (PC y celulares sincronizados), usuarios con permisos y reportes para el contador.
4. Guías de remisión, funcionamiento sin internet con sincronización, app en Play Store.
