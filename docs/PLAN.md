# Plan canónico de PliegoStack

## Dirección

- PliegoStack es una herramienta de ingeniería editorial para imprentas y editoriales de libros álbum.
- El trabajo se enfoca en implementar las capacidades que la industria gráfica necesita para preparar un libro: imposición por firmas, encuadernación, tapa y consumo de tirada.
- No se planifican validaciones comerciales, entrevistas, listas de prospectos, outreach ni pilotos.
  Chris descartó esas etapas el 2026-09-15 para no invertir tiempo fuera del producto.
- Todo dato que dependa de una imprenta, un proveedor o un mercado vive en archivos JSON de configuración leídos en runtime, para reemplazarlo después por datos reales sin recompilar.
- Los valores incluidos en esos archivos son de ejemplo y deben documentarse como tales hasta que alguien los reemplace por datos reales.

## Estado actual

- `4fb1888` endureció los cálculos preliminares: entradas no finitas rechazadas, store atómico, gramajes personalizados por sustrato, vista previa limitada a 250 ubicaciones y copy honesto.
- El 2026-09-15 se verificó con Node v22.22.2 que `npm test` (65 tests) y `npm run build` terminan con código 0 y que no cambió ninguna dependencia.
- La imposición actual ubica páginas sueltas en una rejilla uniforme del pliego, comparando orientación normal y rotada, sin firmas, pinza, calles ni tiro y retiro.
- El lomo es `ceil(páginas / 2) × calibre` y el peso cubre solo el papel interior.
- No existen cálculo de tapa, tipos de encuadernación, tirada, merma ni costos.
- Proporciones, pliegos, sustratos con calibres y valores por defecto están escritos en `src/data/substrates.ts` y `src/store/useBookStore.ts`.

## Principios comunes a todos los incrementos

- Los motores en `src/engine/` siguen siendo funciones puras que reciben los datos de configuración como argumentos y nunca los importan directamente.
- Cada motor rechaza entradas no finitas o fuera de rango con errores explícitos, como ya lo hacen los motores actuales.
- No se añaden dependencias salvo que un incremento demuestre que una es imprescindible y Chris lo apruebe.
- Cada incremento termina en un único commit reversible con tests de motor, store e interfaz.
- Cada incremento con cambios visibles se verifica en un navegador real sobre `npm run preview`, además de los tests en jsdom.
- La interfaz muestra unidades, supuestos y el origen de cada dato configurable, sin presentar valores de ejemplo como datos certificados.

## Orden de incrementos

1. Configuración en runtime.
2. Imposición por firmas.
3. Tipos de encuadernación.
4. Tapa blanda y dura.
5. Tirada, merma y costo.

El orden sigue las dependencias: las firmas necesitan la configuración de máquinas, la encuadernación restringe las firmas y el lomo, la tapa necesita el lomo final y la tirada necesita pliegos por ejemplar, tapa y encuadernación.
Solo el incremento 1 está planificado en detalle; los demás se detallan cuando sean el siguiente.

## Incremento 1 — Configuración en runtime

### Objetivo

- Mover todos los datos de catálogo y los valores por defecto a archivos JSON servidos desde `public/config/`, cargarlos al iniciar la app, validarlos y mostrar un error claro si son inválidos.

### Alcance

- Crear `public/config/sustratos.json` con los sustratos, gramajes y calibres actuales.
- Crear `public/config/pliegos.json` con los formatos de pliego actuales.
- Crear `public/config/formatos.json` con las proporciones y los valores iniciales del libro: sustrato, gramaje, pliego, ancho, proporción, sangrado y páginas.
- Escribir un validador propio, sin dependencias, que informe el archivo, la ruta del campo y el motivo de cada error.
- Resolver la URL de los archivos con `import.meta.env.BASE_URL` para no romper despliegues en subrutas.
- Hacer que el store reciba el catálogo cargado en lugar de importar constantes, conservando la actualización atómica de entradas y resultados.
- Mostrar un estado de carga con `role="status"` y un estado de error con `role="alert"` que no dejen la app en blanco.
- Documentar en `docs/CONFIG.md` cada archivo, cada campo, sus unidades y que los valores entregados son de ejemplo.

### No objetivos

- Editar la configuración desde la interfaz.
- Persistir proyectos o preferencias del usuario.
- Añadir datos de máquinas, encuadernación, tapa o costos, que llegan con sus incrementos.

### Aceptación

- `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" npm test` y `npm run build` terminan con código 0.
- La comparación de `package.json` y `package-lock.json` contra `4fb1888` no muestra paquetes añadidos, eliminados ni actualizados.
- `src/data/substrates.ts` deja de contener catálogos, y ningún archivo de `src/` importa datos de catálogo como constantes.
- Con la configuración entregada, la app calcula los mismos resultados que en `4fb1888` para los valores por defecto, y un test lo demuestra.
- Tests cubren un JSON mal formado, un campo ausente, un número no finito o no positivo, ids duplicados y un valor por defecto que referencia un id inexistente, y cada caso produce un mensaje con archivo y campo.
- Tras `npm run build && npm run preview`, editar un calibre en `dist/config/sustratos.json` y recargar el navegador cambia el lomo mostrado sin recompilar.
- Un fallo de red o un 404 de un archivo de configuración muestra el estado de error accesible en el navegador.

### Rollback

- Revertir el único commit del incremento.

## Incrementos siguientes

- **2 — Imposición por firmas:** configuración de máquinas (formato máximo, pinza, márgenes, calles) y esquemas de plegado; cálculo de firmas por libro, páginas blancas para completar firmas, pliegos por ejemplar y esquema de tiro y retiro, reemplazando la rejilla de páginas sueltas.
- **3 — Tipos de encuadernación:** configuración de grapa, hotmelt, PUR y cosido con múltiplos de páginas válidos, mínimos y máximos, compensación por corrimiento en grapa y aporte al lomo.
- **4 — Tapa blanda y dura:** medidas de tapa con lomo final, sangrado, solapas opcionales y, en tapa dura, cartón, cejas, bisagra y doblez configurables; peso de tapa y plantilla visual con cotas.
- **5 — Tirada, merma y costo:** pliegos y kilos de papel por tirada con merma configurable por proceso, y costo desglosado de papel, impresión y encuadernación a partir de precios y moneda configurables.

## Decisiones pendientes

- Ninguna bloquea el incremento 1.
- Antes del incremento 2 hay que decidir si la imposición por firmas incluye la numeración de páginas en el pliego según el esquema de plegado o solo la geometría y los conteos.
