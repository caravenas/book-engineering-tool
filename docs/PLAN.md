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
El incremento 1 está cerrado en `3f8279c` y el incremento 2 en `2f1b7f4`.
El incremento 3 está planificado en detalle y los demás se detallan cuando sean el siguiente.

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

## Incremento 2 — Imposición por firmas

### Objetivo

- Reemplazar la rejilla de páginas sueltas por una imposición por firmas real, que respete la pinza y los márgenes de máquina y numere cada página en el pliego según el esquema de plegado.

### Alcance

- Crear `public/config/maquinas.json` con las prensas: id, nombre, formato máximo de pliego, pinza, márgenes laterales y de cola, calles entre páginas y el campo `source`.
- Crear `public/config/esquemas.json` con los esquemas de plegado: id, nombre, páginas por firma, rejilla de cada cara y el orden de páginas por cara, indicando para cada posición el número de página y su rotación.
- Validar que cada esquema cubra exactamente una vez todas las páginas de la firma entre tiro y retiro, que la rejilla coincida con el número de posiciones y que las rotaciones sean 0 o 180 grados.
- Escribir `src/engine/signatures.ts` como motor puro que, a partir del tamaño de página con sangrado, el pliego, la máquina y los esquemas disponibles, calcule qué esquemas caben, páginas por pliego, firmas por ejemplar, páginas en blanco para completar la última firma, pliegos por ejemplar y si el pliego se imprime en tiro y retiro o con planchas separadas.
- Elegir por defecto el esquema que menos papel desperdicia y permitir elegir otro manualmente.
- Añadir al store la máquina, el esquema y el modo de impresión, conservando la actualización atómica de entradas y resultados y los errores explícitos.
- Mostrar la vista previa de una cara con el número de página y la rotación de cada posición, más un resumen con firmas, blancos y pliegos por ejemplar.
- Documentar los dos archivos nuevos en `docs/CONFIG.md`.

### No objetivos

- Restricciones de encuadernación, que llegan en el incremento 3.
- Tapa, tirada, merma y costos.
- Exportar un PDF de imposición.
- Imponer trabajos combinados con páginas de distintos tamaños en un mismo pliego.

### Aceptación

- `npm test` y `npm run build` terminan con código 0 y no se añade ninguna dependencia.
- Un esquema al que le falte una página, le sobre una o tenga una rejilla incoherente produce un error con archivo y ruta del campo.
- Con 32 páginas y un esquema de 16 que cabe en el pliego, el resultado es 2 firmas, 0 páginas en blanco y 2 pliegos por ejemplar, y un test lo demuestra.
- Con 30 páginas y ese mismo esquema, el resultado es 2 firmas y 2 páginas en blanco, y un test lo demuestra.
- Un esquema que no cabe una vez descontadas la pinza y los márgenes no se ofrece como opción, y un test lo demuestra.
- La vista previa numera las páginas según el esquema seleccionado, verificado en un navegador real.
- Editar el orden de páginas en `dist/config/esquemas.json` cambia la numeración mostrada tras recargar, sin recompilar.

### Rollback

- Revertir el único commit del incremento.

## Incremento 3 — Tipos de encuadernación

### Objetivo

- Hacer que el tipo de encuadernación restrinja el número de páginas válido, aporte su parte al lomo y exponga la compensación por corrimiento cuando el método la necesita.

### Alcance

- Crear `public/config/encuadernaciones.json` con los métodos: id, nombre, múltiplo de páginas exigido, mínimo y máximo de páginas, aporte al lomo en milímetros, corrimiento por hoja en milímetros, si exige que las páginas sean múltiplo del tamaño de firma, y el campo `source`.
- Entregar como ejemplo grapa, hotmelt, PUR y cosido, con la misma advertencia de datos de ejemplo que los demás archivos.
- Añadir `defaults.bindingId` a `public/config/formatos.json`, referenciando un método existente.
- Validar los métodos con las mismas reglas del resto del catálogo: ids limpios y únicos, múltiplos y límites como enteros positivos, mínimo menor o igual que máximo, aportes y corrimientos finitos no negativos, y la referencia por defecto existente.
- Escribir `src/engine/binding.ts` como motor puro que valide un número de páginas contra un método, calcule el lomo final sumando el aporte del método al lomo del papel interior, y calcule la compensación por corrimiento a partir del calibre y del número de pliegos plegados que se anidan.
- El corrimiento existe porque los pliegos de un método anidado se meten uno dentro de otro, así que se cuentan pliegos plegados y no hojas finales: un libro de 64 páginas anida 16 pliegos, no 32 hojas.
- Añadir al store el método elegido, su resultado y su error, conservando la actualización atómica de entradas y resultados.
- Mostrar en la interfaz el selector de método, un mensaje explícito cuando el número de páginas no es válido para ese método, el lomo final junto al lomo interior, y el corrimiento cuando corresponde.
- Documentar el archivo nuevo en `docs/CONFIG.md`.

### No objetivos

- Tapa, tirada, merma y costos.
- Cambiar la imposición por firmas o los motores de lomo y aprovechamiento existentes, más allá de consumir su resultado.
- Proponer automáticamente un método de encuadernación según el lomo.

### Aceptación

- `npm test` y `npm run build` terminan con código 0 y no se añade ninguna dependencia.
- Un número de páginas que no cumple el múltiplo del método produce un mensaje que nombra los números válidos más cercanos, y un test lo demuestra.
- Un número de páginas por debajo del mínimo o por encima del máximo del método produce un mensaje explícito, y un test lo demuestra.
- El lomo final suma el aporte del método al lomo del papel interior, ambos visibles por separado, y un test fija el valor esperado.
- La compensación por corrimiento se calcula solo para los métodos que anidan sus pliegos, con un valor fijado por un test a partir del calibre y del número de pliegos anidados.
- Editar `dist/config/encuadernaciones.json` cambia los números de página aceptados tras recargar, sin recompilar.
- La interfaz muestra el método, el lomo final y el mensaje de páginas inválidas, verificado en un navegador real.

### Rollback

- Revertir el único commit del incremento.

## Incrementos siguientes

- **4 — Tapa blanda y dura:** medidas de tapa con lomo final, sangrado, solapas opcionales y, en tapa dura, cartón, cejas, bisagra y doblez configurables; peso de tapa y plantilla visual con cotas.
- **5 — Tirada, merma y costo:** pliegos y kilos de papel por tirada con merma configurable por proceso, y costo desglosado de papel, impresión y encuadernación a partir de precios y moneda configurables.

## Decisiones pendientes

- Ninguna bloquea el incremento 3.
- Chris decidió el 2026-09-15 que la imposición por firmas incluye la numeración de páginas en el pliego según el esquema de plegado, además de la geometría y los conteos.
- Quedan pendientes, sin bloquear: tests adicionales del validador de configuración, y resolver el logo y el favicon con `BASE_URL` para despliegues en subrutas.
- Los esquemas de plegado entregados son ejemplos construidos a mano: su emparejamiento de páginas está verificado, pero su convención de plegado debe confirmarse contra un pliego doblado real.
- El motor de firmas no considera imponer varias firmas lado a lado en un mismo pliego, lo que desaprovecha pliegos grandes con páginas pequeñas; es candidato a un incremento posterior.
