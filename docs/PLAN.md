# Plan canónico de PliegoStack

## Dirección

- PliegoStack es una herramienta de ingeniería editorial para imprentas y editoriales de libros álbum.
- El trabajo se enfoca en implementar las capacidades que la industria gráfica necesita para preparar un libro: imposición por firmas, encuadernación, tapa y consumo de tirada.
- No se planifican validaciones comerciales, entrevistas, listas de prospectos, outreach ni pilotos.
  Chris descartó esas etapas el 2026-09-15 para no invertir tiempo fuera del producto.
- Todo dato que dependa de una imprenta, un proveedor o un mercado vive en archivos JSON de configuración leídos en runtime, para reemplazarlo después por datos reales sin recompilar.
- Los valores incluidos en esos archivos son de ejemplo y deben documentarse como tales hasta que alguien los reemplace por datos reales.

## Estado actual

- Los incrementos 1, 2, 3 y 4 están cerrados; el siguiente es el incremento 5, tirada, merma y costo.
- El 2026-09-17 se verificó con Node v22.22.2, sobre `f8f3473`, que `npm test` (273 tests) y `npm run build` terminan con código 0, sin dependencias nuevas.
- Todo el catálogo y los valores por defecto se leen en runtime desde siete archivos de `public/config/`, validados al iniciar y documentados en `docs/CONFIG.md`.
- La imposición por firmas vive en `src/engine/signatures.ts`: respeta pinza, márgenes y calles de la máquina, numera las páginas según el esquema de plegado y calcula firmas, blancos y pliegos por ejemplar.
- La encuadernación vive en `src/engine/binding.ts`: restringe el número de páginas por método, suma el aporte del método al lomo del papel interior y calcula el corrimiento solo para los métodos con `nests: true`.
- La tapa vive en `src/engine/cover.ts`: para tapa blanda calcula el ancho y alto del pliego con lomo, sangrado y solapas opcionales, y para tapa dura las medidas de los cartones laterales, el cartón de lomo y el forro con sus canales y dobleces.
- El peso cubre el papel interior y el papel de tapa, mostrados por separado; en tapa dura se devuelve la superficie de cartón pero no su peso, porque el catálogo no declara su densidad.
- Siguen sin existir cálculo de tirada, merma ni costos.

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
El incremento 1 está cerrado en `3f8279c`, el incremento 2 en `2f1b7f4`, el incremento 3 en `8fefcdd` y el incremento 4 en `f8f3473`.
El incremento 5 es el siguiente y todavía no está planificado en detalle.

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

- **4 — Tapa blanda y dura:** ver la sección detallada más abajo.
- **5 — Tirada, merma y costo:** pliegos y kilos de papel por tirada con merma configurable por proceso, y costo desglosado de papel, impresión y encuadernación a partir de precios y moneda configurables.

## Incremento 4 — Tapa blanda y dura

### Objetivo

- Calcular las medidas y el peso de la tapa a partir del lomo final que ya produce la encuadernación, distinguiendo la tapa blanda de la dura, y mostrarlas como una plantilla con cotas.

### Alcance

- Crear `public/config/tapas.json` con los tipos de tapa: id, nombre, si es blanda o dura, ancho de solapa, ceja, canal de bisagra, doblez de forro, grosor de cartón, gramaje del material de tapa, y el campo `source`.
- Añadir `defaults.coverId` a `public/config/formatos.json`, referenciando un tipo existente.
- Usar el campo `nests` de `encuadernaciones.json` para saber si un método produce lomo plano o solo un pliegue, sin añadir un campo nuevo: un método con `nests: true` produce un pliegue y uno con `nests: false` produce lomo plano, igual que ya lo interpreta `src/components/SpineCalculator.tsx`.
- La tapa solo ofrece los tipos compatibles con el método elegido: un método sin lomo plano no ofrece tapa dura.
- Validar los tipos de tapa con las mismas reglas del resto del catálogo, incluida la regla de que una tapa dura exige cartón, ceja, canal y doblez mayores que cero, y una blanda no los usa.
- Escribir `src/engine/cover.ts` como motor puro que calcule, para tapa blanda, el ancho y alto del pliego de tapa con lomo, sangrado y solapas opcionales; y para tapa dura, las medidas de cada cartón, el cartón de lomo, y el forro con sus dobleces y canales.
- Calcular el peso del papel de tapa a partir de su superficie y su gramaje.
- En tapa dura, devolver además la superficie de cartón, pero no su peso: el catálogo no declara la densidad del cartón, y estimarla sería inventar un número.
- Queda pendiente, para cuando se necesite, añadir esa densidad al catálogo y con ella el peso del cartón.
- Añadir al store el tipo de tapa elegido, su resultado y su error, conservando la actualización atómica.
- Mostrar en la interfaz un panel de Tapa con las medidas, el peso y una plantilla proporcional con cotas legibles.
- Documentar el archivo nuevo en `docs/CONFIG.md`.

### No objetivos

- Exportar un PDF o líneas de troquel.
- Sobrecubiertas, camisas y fajas.
- Tolerancias de producción del encajado, que dependen de cada taller.
- Tirada, merma y costos, que son el incremento 5.

### Aceptación

- `npm test` y `npm run build` terminan con código 0 y no se añade ninguna dependencia.
- Un método sin lomo plano no ofrece tapa dura, y un test lo demuestra.
- Con un libro de 32 páginas, couché mate de 150 g y tapa blanda sin solapas, el ancho del pliego de tapa es dos veces el ancho de página más el lomo final más el sangrado de ambos lados, y un test fija el valor.
- Con solapas, el ancho incluye dos veces el ancho de solapa, y un test fija el valor.
- En tapa dura, el forro mide dos veces el cartón más el cartón de lomo, más los canales y los dobleces, y un test fija cada componente por separado.
- El peso de la tapa se muestra separado del peso del interior, y un test fija ambos.
- Editar una ceja o un doblez en `dist/config/tapas.json` cambia las medidas tras recargar, sin recompilar.
- La plantilla con cotas se verifica en un navegador real.

### Rollback

- Revertir el único commit del incremento.

## Rediseño de la interfaz — R-1, R-2 y R-3

Ejecutan `docs/UI-REDESIGN.md`, aprobado por Chris el 2026-09-19.
Ese documento manda sobre `docs/UX-REVIEW.md` allí donde difieran.
Las afirmaciones sobre lo que la página mide van en `e2e/`, el arnés de navegador que entró con R-1; ninguna vale en Vitest, que corre en jsdom y no maqueta.

Se parte en tres porque la hipótesis central del rediseño, que la herramienta cabe en una pantalla, no se puede probar moviendo los paneles actuales a tres columnas: lo que tiene que separarse, los controles, la vista previa y los resultados, vive soldado dentro de cada panel.

### R-1 — El desbordamiento horizontal a 390 px

Objetivo: cerrar el defecto que el inventario midió, 397 px de contenido en un viewport de 390.
Es independiente del rediseño y se hace primero porque es pequeño y verificable por sí solo.
No basta con llevar las pistas de `app-grid` a `minmax(0, 1fr)`: eso mueve el desbordamiento al hijo rígido en vez de eliminarlo, así que hay que encontrar ese hijo.

Aceptación: a 390 px, `document.documentElement.scrollWidth` no supera el ancho del viewport, y ningún elemento termina más allá del borde; sin cambio a 1440 ni a 1024.

**Cerrado el 2026-09-19** en `f28b2ce`.
La causa no era la que parecía: ningún descendiente sobresalía.
`.app-cell` es elemento de rejilla y su `min-width` automático vale `min-content`, así que la celda se estiraba por encima de su pista y arrastraba a la página.
Una sola declaración, `min-width: 0`, lleva 397 px a 384 a 390 px y no cambia nada a 1440 ni a 1024.
El arnés de navegador llegó justo después, en `ef3531d`, y se comprobó en rojo antes que en verde contra esta misma regla.

### R-2 — Separar controles, vista previa y resultados

Objetivo: que cada panel exponga sus resultados y su diagrama como regiones propias, sin cambiar todavía dónde se dibujan.
Hoy los resultados están en cuatro `stat-grid` repartidos entre `SpineCalculator`, `BindingPanel` y `CoverPanel`, más seis `stat-label` sueltos dentro de `ImpositionVisualizer`, que tiene 1171 líneas y es el riesgo del incremento.

La restricción que le da forma: **un componente de resultados no recibe props**.
Lee el store por su cuenta, porque en R-3 va a vivir en otra columna y su panel ya no podrá pasarle nada.

Eso se cumple solo en tres de los cuatro casos.
`BindingPanel`, `CoverPanel` e `ImpositionVisualizer` derivan sus resultados del store y salen limpios: `bindingSpine`, `coverResult` y `signaturePlan.selected`.
`SpineCalculator` no: su `safeResult` depende de `rawTotalPages`, un `useState` local con el texto que el usuario está escribiendo, y por eso sabe que la entrada es inválida.
Si los resultados se van a otra columna, dejan de saberlo, y la propuesta pide justamente que se oculten mientras la entrada no sea válida.

Decisión, 2026-09-19: el texto crudo del número de páginas pasa al store como fuente única, y el número se deriva de él dentro de la misma actualización atómica que ya usa el resto del store.
La alternativa, un booleano de validez junto al número, guarda dos veces lo mismo y obliga a mantenerlos en sincronía.

**Corrección a esa decisión, el mismo día, al mirar el componente en vez de solo el store.**
La decisión original decía que una entrada inválida conserva el último número de páginas válido.
Eso contradice lo que la app hace hoy: `SpineCalculator.tsx:67` llama a `setTotalPages(parsePositiveSafeInteger(rawValue) ?? 0)`, es decir, pone el número a cero, y de ahí sale el error que muestran Imposición, Encuadernación y Tapa.
Conservar el último valor válido dejaría a esos tres paneles enseñando cifras viejas como si fueran actuales mientras alguien teclea.
R-2 es un refactor y no puede cambiar comportamiento, así que la semántica se alinea con la de hoy: texto inválido pone el número a cero, y el texto crudo viaja aparte para que los resultados sepan que la entrada no es válida.

Qué debería ocurrir de verdad mientras alguien teclea algo inválido es una pregunta de producto, no de refactor.
La propuesta pide que las cifras dependientes se oculten y vuelvan al corregir el valor, que no es ni lo uno ni lo otro: exige que cada panel conozca el estado de entrada inválida, cosa que ahora es posible porque el texto vive en el store.
Queda para R-3 o para una decisión de Chris, y no se resuelve por inercia dentro de un refactor.

Por eso R-2 va en dos entregas: primero las tres extracciones que no tocan el store, que fijan el patrón; después la del lomo, que sí lo toca y lleva revisión cruzada.

**Primera entrega cerrada el 2026-09-19** en `cb96e7a`: `BindingSpineResults`, `CoverResults` e `ImpositionResults`, ninguno con props, cada uno montado donde estaba su bloque.
Cuatro formateadores subieron de tres componentes a `src/engine/units.ts`, donde ya vivía `formatMeasurement`, porque los paneles los siguen necesitando para lo que no se extrajo.

Queda anotado un efecto de la restricción, observado por el builder: `hasFlatSpine` se deriva ahora dos veces, idéntica, en `BindingPanel` y en `BindingSpineResults`.
Unificarlo exige un selector en el store, que es precisamente lo que abre la segunda entrega, así que se resuelve allí y no antes.

**Segunda entrega cerrada el 2026-09-19** en `3c2bbc5`, `1fbabed` y `e3df2c1`: el campo `totalPagesInput` en `BookStore`, sus correcciones tras revisión independiente, y `SpineResults`.
El store exporta ahora `parsePositiveSafeInteger` y `getSafeSpineResult`, funciones puras que panel y resultados comparten en vez de duplicar.

Verificado en navegador lo que ningún test automático cubría, porque es justo lo que esta entrega tocaba: al vaciar el campo de páginas, `aria-invalid` pasa a verdadero, los cuatro paneles ocultan sus resultados y cada uno muestra su propio error; al restaurar el valor, todo vuelve.
Ese comportamiento es idéntico al de antes del incremento.

Lección de las dos entregas, para R-3: extraer un componente tienta a copiar la derivación en vez de compartirla.
Ocurrió tres veces, con tres formateadores, con el parser del número de páginas y con `safeResult`, y ninguna la habría detectado un test.
Los encargos de R-3, que mueven seis paneles, tienen que decirlo por adelantado.

### R-2 cerrado

**Cerrado el 2026-09-19.**
Los cuatro bloques de resultados y las tres vistas previas extraíbles viven en componentes propios, y ninguno recibe props.
Queda fuera, a propósito y con motivo escrito más arriba, el SVG del pliego de `ImpositionVisualizer`.

Lo que se movió a funciones puras compartidas, en vez de duplicarse:
`parsePositiveSafeInteger`, `getSafeSpineResult`, `getSelectedBindingInfo` y `getPlannedCover` en `src/store/useBookStore.ts`, porque derivan estado de dominio a partir de las formas del store;
`formatRoundedValue`, `formatMm`, `formatWeight`, `formatArea`, `toDisplayValue` y `getPageDisplayDimensions` en `src/engine/units.ts`, porque reciben números y devuelven números sin mirar el store.
Esa es la frontera, y conviene respetarla en R-3.

Verificado en navegador que las vistas previas se dibujan de verdad, cosa que el guardián no puede comprobar porque un SVG vacío no cambia el alto de su contenedor:
la vista de página mide 95 × 140 con la etiqueta «140 × 210 mm + 3 mm sangrado», la barra del lomo mide 6 × 100 con sus dos tapas, y los dos SVG traen 18 y 8 formas.

### Puntos abiertos que dejó la revisión de R-3a

- La cabecera ocupa 161 px de los 900 del viewport, casi un quinto de la pantalla que estamos intentando aprovechar, entre un logo de 7 rem y un título de 6 rem.
  Reducirla es restyle y no tocaba en R-3a, pero es el mayor desperdicio de la única pantalla.
- Los resultados de tapa dura, nueve etiquetas, no los comprueba ningún test: `e2e/inventory.spec.ts` solo audita el estado por defecto, que es tapa blanda.
  Es un agujero anterior a R-3a, pero ahora que los resultados viven juntos en una columna se nota más.
- Las tarjetas de resultado no comparten estilo: las del lomo y la encuadernación llevan borde, las de imposición no.
  Vivían en paneles distintos y nadie las veía juntas; ahora están una debajo de otra.

### Lo que falta para cerrar R-2

- ~~Las vistas previas~~, cerradas: tres de las cuatro.
  El dibujo de página de `CanvasDesigner`, el del lomo en `SpineCalculator` y los SVG de tapa en `CoverPanel` derivan todo del store y salen como salieron los resultados.

  **El SVG del pliego de `ImpositionVisualizer` se aplaza a R-3, con motivo.**
  Depende de `side`, la cara mostrada, que es un `useState` local del panel, y su selector vive hoy en el área de controles.
  Extraer la vista previa dejándole el selector al panel exige pasarle una prop, que es justo lo que R-2 prohíbe porque rompería R-3.
  Moverlo ahora resolvería el nudo, pero el selector cambiaría de sitio y R-2 promete que la página queda idéntica.
  En R-3 el nudo se deshace solo: la propuesta pone ese conmutador sobre la vista previa, así que estado y control viajan juntos al mismo componente y no hace falta ni prop ni store.
- ~~La unificación de `hasFlatSpine`~~ y ~~un guardián del estado de entrada inválida~~: cerrados el 2026-09-19 en `a1c48e4` y `541e525`.
- **Desacoplar `SpineResults` de la geometría del dibujo del lomo.**
  Lo encontró un builder al intentar probar el guardián: `SpineCalculator.tsx:76` monta `<SpineResults />` dentro de un ternario condicionado por `safeResult && spineBarWidth !== null`, y `spineBarWidth` es el ancho de la barra del dibujo.
  Hoy las dos condiciones son equivalentes, así que no hay defecto visible, pero significa que la guarda propia de `SpineResults` nunca llega a ejercitarse: el padre decide si se dibuja.
  Eso contradice el objetivo de R-2, porque en R-3 el padre ya no estará ahí para decidir.
  La rama alternativa de ese ternario es además la nota «Corrige los valores indicados», que hoy sustituye a la vez al dibujo y a los resultados, y necesitará dueño cuando los dos se separen.
  Se resuelve junto con la extracción de las vistas previas, que es cuando el ternario se deshace.

**Vistas previas cerradas el 2026-09-19** en `92ed5ee` y `86db602`, salvo la del pliego, aplazada arriba.
`CoverPreview`, `SpinePreview` y `SpineThicknessPreview`, ninguna con props.
El ternario quedó deshecho: el panel del lomo monta las tres piezas sin condicionarlas y conserva solo la nota «Corrige los valores indicados», que es lo único que sí le pertenece.
`SpineCalculator` pasó de 160 líneas a 82 y `CoverPanel` de 420 a 82.

Dos cosas que el builder hizo bien y conviene que queden escritas.

Se desvió del encargo con motivo y lo midió antes: pedí un solo componente con los dos dibujos del lomo, sin darme cuenta de que viven en columnas distintas de `.spine-calculator-grid`.
Juntarlos habría subido una columna de 280 a unos 390 px y roto el alto fijado por el guardián.
Quedaron dos componentes que comparten la derivación por un hook privado y se montan cada uno en su columna.
El encargo estaba mal, no la implementación.

Y avisó de un cambio de comportamiento en un caso extremo: la nota de fallback de tapa cubría también el caso de un plan válido con geometría no finita, y ahora ese caso mostraría un contenedor vacío.
No se encontró forma de alcanzarlo desde la interfaz, así que se deja, pero conviene saber que «inalcanzable» aquí está afirmado y no demostrado.

No objetivo: cambiar la disposición, los tokens o cualquier cifra.

Aceptación: la página renderizada es idéntica a la de antes del incremento, `npm run test:browser` sigue en verde, y los tests, `tsc` y el build siguen en cero.

### R-3 — Las tres columnas

Objetivo: componer ficha, vista previa y resultados en tres columnas a partir de las regiones de R-2, con el acordeón de cinco pasos y el selector de vista.

No objetivos: el Catálogo unificado, los tokens nuevos y la paleta.
Esos vienen después, porque R-3 existe para probar la hipótesis antes de invertir en ellos.

Aceptación, como specs de `e2e/`: a 1440 px la página no se desplaza en vertical y solo se desplazan las columnas; a 390 px sigue sin haber desplazamiento horizontal; ningún control del inventario desaparece.

**La red cambia antes de empezar.**
`e2e/panels.spec.ts` fija el alto de cada panel y qué etiquetas contiene cada uno.
Le sirvió a R-2, que prometía no mover nada; R-3 hace lo contrario, así que esas dos afirmaciones dejan de valer por diseño y hay que retirarlas cuando lleguen a estorbar.
Retirarlas no es debilitar la red si antes existe la que sí sobrevive, y esa es `e2e/inventory.spec.ts`: el conjunto de controles interactivos de la página y el conjunto de etiquetas de resultado, ambos sin importar en qué contenedor vivan.
Esa es exactamente la propiedad que R-3 promete conservar, y hoy no la comprobaba nadie.

### Por dónde se parte R-3

- **R-3a**, la estructura: tres columnas a 1440, con los resultados agrupados en la suya.
  Es lo que prueba la hipótesis de que la herramienta cabe en una pantalla, y se hace antes que nada porque si falla, lo demás sobra.

  **Cerrado el 2026-09-20** en `d5b16f2`, `96310de` y `010582f`.
  La hipótesis se sostiene: a 1440 la página mide exactamente el alto del viewport y las tres columnas se desplazan por dentro, 400 / 720 / 320.
  Lo implementó el capitán, por decisión de Chris, después de que tres delegaciones fracasaran sin producir un commit; la revisión independiente se hizo igual, y encontró cosas.

  La que más importaba: el estado vacío de la plantilla de tapa seguía diciendo «revisa el mensaje anterior», y ese mensaje había quedado en otra columna.
  Es el riesgo propio de mover cosas de sitio, y ningún test lo habría visto: un texto que sigue siendo correcto como frase y ha dejado de serlo como instrucción.

  Dos hallazgos más que valen para lo que queda: un `aria-label` sobre un `div` no anuncia nada, porque sin rol no hay región que nombrar; y bloquear el alto del viewport tira contenido en silencio al imprimir y en ventanas bajas, así que hay escapes para ambos, con su test.
- **R-3b**, el acordeón de cinco pasos en la columna de la ficha.

  **Cerrado el 2026-09-20** en `0e14979` y `6ee707a`.
  Seis paneles pasan a cinco pasos, porque un número de páginas y el método que lo rechaza son una decisión y no dos.
  Construido sobre `<details name>`, que trae el comportamiento exclusivo, el teclado y el estado anunciado sin escribir nada.
  La cabecera bajó de 161 a 65 px: con la anterior la ficha no cabía debajo, que es justo lo que el acordeón promete.

- **R-3c**, el selector de vista y la mudanza del SVG del pliego, con su conmutador de cara mostrada, que es cuando se deshace el nudo aplazado en R-2.

  **Cerrado el 2026-09-20** en `975bbd6`.
  El nudo se deshizo como estaba previsto: el conmutador de cara viajó con el dibujo, así que no hizo falta ni prop ni store.
  El lomo tiene vista propia, que la propuesta no contemplaba: dibuja algo que los otros tres no, y perder un dibujo mientras se dice que solo se mueven cosas no es un cambio que este incremento pueda hacer.

## Catálogo unificado — R-4

Ejecuta la sección «Catálogo unificado» de `docs/UI-REDESIGN.md`.
Hoy añadir, editar y ocultar están sembrados por los pasos como enlaces de 11 px, y cada catálogo los ofrece de forma distinta.

El store ya tiene toda la superficie que hace falta: `addCustom*`, `removeCustom*`, `patch*`, `unpatch*`, `hide*` y `show*` para proporciones, pliegos, prensas y encuadernaciones, y alta y baja para gramajes.
**R-4 es interfaz pura**: no toca el modelo de datos ni los motores.

Se parte en cortes verticales y no por capas, para que no haya una ventana en la que la misma función esté en dos sitios.

- **R-4a**: el panel, su navegación por los ocho catálogos agrupados en Formato, Papel y Producción, con candado en los tres que solo se leen, y **Prensas** completo dentro.
  Los controles de prensa desaparecen del paso 04 en el mismo incremento.

  **Cerrado el 2026-09-20** en `db8dd0c` y `fdb9544`.
  El paso 04 pasa de tres controles a uno que abre el catálogo, y `ImpositionVisualizer` de 950 a 473 líneas.
  Los tres catálogos que solo se leen —papeles, esquemas y tapas— se pueden mirar por primera vez.

  **Una entrada propia no se puede editar**, y el formulario ahora lo dice en vez de ofrecer un guardado que no guarda: el store solo parchea entradas de fábrica.
  Es una limitación anterior a R-4, que el formulario en línea escondía ocultando su control de editar.
  Darles edición de verdad exige una acción nueva en el store y queda como punto abierto.
- **R-4b**: Pliegos, Proporciones y Encuadernaciones entran igual, y salen de sus pasos.

  **Cerrado el 2026-09-20** en `363acad` y `5f72a5b`.
  Los cuatro catálogos comparten un formulario guiado por un descriptor, en vez de cuatro copias de las mismas veinte decisiones.
  `CanvasDesigner` pierde 240 líneas, `BindingPanel` 435 e `ImpositionVisualizer` otras 340.

- **R-4c**: Gramajes anidados bajo Papeles, la sección de ocultas para restaurar, y el indicador de persistencia en la cabecera del panel.

  **Cerrado el 2026-09-21** en `9ea785d`.
  Un gramaje no es un catálogo hermano de los papeles: cuelga de uno y se identifica por su propio valor, así que no hay id que parchear ni nada que ocultar.
  El descriptor lo dice omitiendo `patch`, `unpatch` y `hide`, y el formulario muestra solo lo que ese catálogo puede hacer.
  La sección de ocultas se resolvió por catálogo, en la propia cabecera de cada formulario, en vez de como una sección aparte.

## Estilo — R-5

Ejecuta la sección «Estilo» de `docs/UI-REDESIGN.md`.
Todo R-3 y R-4 fue estructura; esto es lo que hace que la app se parezca a la propuesta además de comportarse como ella.

**Cerrado el 2026-09-21** en `f753973`, `9a619cd` y `55eaf82`.

- Las diecinueve tarjetas con borde pasan a dieciséis filas de nombre y cifra separadas por filetes, dibujadas por un solo componente y marcadas como lista de definición, que es lo que son.
- Un único control segmentado, usado en formato, proporción, vista y gramajes, en vez de tres implementaciones de la misma idea.
- El acento queda con dos nombres que dicen lo que hacen: el cian rellena dibujos, y lo que se lee o se ve como contorno usa la versión en tinta.
  El anillo de foco era lo último en cian, a 2.59:1; ahora está a 6.43:1.

Quedó fuera por decisión de Chris el 2026-09-21: los 40 px en todos los controles.
El test de tamaños sigue midiendo solo el catálogo y los botones que lo abren, y lo dice.

### Lo que el rediseño deja sin construir

Los cuatro primeros los cierra R-6; el quinto sigue siendo una decisión de Chris.

- La barra de resultados fija a 390 px, con lomo, pliegos y peso.
- La sección desplegable «Cómo se calcula» para las fórmulas, que hoy se muestran siempre en el paso del lomo.
- Un único distintivo «Datos de ejemplo» en la cabecera en vez de la nota de origen repetida en cada paso.
- El distintivo de origen junto a la etiqueta del campo, en vez de bajo el control.
- **Una discrepancia entre el texto de la propuesta y su canvas**: el texto dice que el segmento activo es igual «en formato, proporción, vista y cara mostrada», lo que implica que la cara mostrada sea segmentada; el canvas la dibuja como un desplegable.
  **Resuelta el 2026-09-21 por Chris: se queda como desplegable, por ahora.**

### Lo que el catálogo dejó abierto

- Una entrada propia no se edita, solo se elimina y se vuelve a añadir; exige una acción de store que no existe.
- El formulario edita la entrada **seleccionada**, y la lista de arriba no deja elegir otra para editarla ni marca cuál es.
- La prueba de reconciliación del guardián perdió fuerza con el modal: al barrer el documento con el panel cerrado, los catálogos no visitados están desmontados.
- El recorrido no abre los formularios de alta, así que sus campos en modo alta siguen fuera del inventario.
- El test de tamaños mide el catálogo y los botones que lo abren, no los controles que quedan en los pasos: los segmentos miden 23 px, los campos 35 y las fichas de gramaje 21.
  Eso es trabajo del restyle, y ese incremento tiene que ampliar el test y dejarlo en verde.

Dos decisiones ya tomadas, de `docs/UI-REDESIGN.md`:
una entrada de fábrica ofrece «Volver a fábrica» y «Ocultar», y una entrada tuya ofrece «Eliminar» en su lugar, porque no tiene fábrica a la que volver;
y los gramajes no son un catálogo hermano sino una lista dentro de un papel, porque cuelgan de él y no tienen identidad propia.

El panel se construye sobre `<dialog>` y `showModal()`, por la misma razón que el acordeón sobre `<details>`: la plataforma ya trae el foco atrapado, el cierre con Escape y el fondo inerte, y escribir eso a mano es la parte que se hace mal.

Exportar e importar siguen sin sitio, y siguen anotados: cuando UX-8 se retome, su lugar es la cabecera de este panel.

### Puntos abiertos tras R-4a

- Una entrada propia no se edita, solo se elimina y se vuelve a añadir.
  Exige una acción de store que hoy no existe.
- El formulario edita la prensa **seleccionada**, y la lista de arriba no deja elegir otra para editarla ni marca cuál es.
  Funciona, pero no es lo que el canvas dibuja.
- La prueba de reconciliación del guardián perdió fuerza con el modal: al barrer el documento con el panel cerrado, seis de los siete catálogos están desmontados, así que ese barrido ya no puede delatar un control que el recorrido no visite.
- El recorrido tampoco abre los formularios condicionales que quedan en los pasos, así que sus campos siguen fuera del inventario.

### Puntos abiertos tras R-3

- Los resultados de tapa dura, nueve etiquetas, no los comprueba ningún test: el guardián audita el estado por defecto, que es tapa blanda.
- Los formularios condicionales de alta y edición, unos veinticinco campos, quedan fuera del inventario: el recorrido no los abre.
  Nunca estuvieron dentro, pero conviene saberlo antes de fiarse del número 36.
- Las tarjetas de resultado no comparten estilo: unas llevan borde y otras no.
  Vivían en paneles distintos y ahora están una debajo de otra.
- Dos preguntas de accesibilidad sin respuesta verificada: si un `<h2>` dentro de un `<summary>` se anuncia bien, y si `aria-pressed` es lo correcto para un selector de una sola opción frente a un grupo de radio con flechas.
  Ambas exigen probar con un lector de pantalla real, que es lo único que las contesta.
- La etiqueta «NÚMERO DE PÁGINAS» sigue en mayúsculas en el JSX y no por CSS, así que el nombre accesible va en mayúsculas.
  Los títulos de los pasos sí lo hacen bien, con `text-transform`.

### Cómo evolucionó la red, que es lo que hizo posible R-3

Cada incremento retiró la parte del guardián que él mismo invalidaba, pero solo después de que existiera la que sobrevive.

`e2e/panels.spec.ts` fijaba alturas y la correspondencia panel-etiqueta; lo sustituyó `e2e/inventory.spec.ts`, que fija el recuento por nombre de los controles y el conjunto de etiquetas de resultado sin mirar dónde viven.
Cuando el acordeón dejó controles en el DOM pero fuera de alcance, el guardián pasó a recorrer los pasos abriéndolos; cuando el conmutador empezó a desmontar las vistas no elegidas, pasó a recorrerlas también.
Y como un recorrido por regiones con nombre puede no mirar donde alguien añada algo, una segunda prueba exige que un barrido del documento no encuentre nada que el recorrido no haya contado.

La lección, para quien siga: retirar una aserción obsoleta no es debilitar la red si la propiedad que protegía queda cubierta por otra más difícil de engañar. Lo que no vale es retirarla y no reemplazarla.

### Rollback

- Revertir el único commit del incremento que falle; los tres son independientes en ese orden.

## Lo que faltaba del rediseño — R-6

Cierra los cuatro puntos que `docs/UI-REDESIGN.md` dejaba sin construir tras R-5.

**Cerrado el 2026-09-21** en `2585009`, `5bb788d` y `af759d5`.

- Las fórmulas del lomo y el párrafo de corrimiento pasan a un `<details>` «Cómo se calcula» al pie de la columna de resultados, que es lo que explican.
  El corrimiento gana además la cifra que pide la propuesta: «Corrimiento máx.» se lee como número junto al resto, y el párrafo queda detrás del desplegable.
  Un método que no anida no tiene corrimiento, así que no aparece ninguno de los dos en vez de informar un cero que parecería medido.
- El distintivo de origen sube junto a la etiqueta del campo, donde deja de leerse como pie del valor.
  Aparece en los cinco catálogos que se pueden cambiar, gramajes incluidos, y en ninguno que no: decir «de fábrica» junto a un campo que nunca podría decir otra cosa es ruido.
  La línea «X personalizada» que lo acompañaba decía lo mismo que «tuyo» y se fue; sobrevive la coletilla que añade algo, «guardada solo para esta sesión», y solo cuando el almacenamiento no está disponible.
- Las cinco copias de la nota de procedencia se reducen a un distintivo «Datos de ejemplo» en la cabecera, y a la línea que cada catálogo imprime de su propio archivo, leída del catálogo y no escrita en el panel.
- La barra de resultados fija a 390 px, con lomo, pliegos y peso interior, pegada arriba mientras el resto se desplaza bajo ella.

### Lo que R-6 no construyó, y por qué

- **La nota al pie de la ficha**, que la propuesta pide junto al distintivo de la cabecera.
  Medida: ocupa 140 px y la ficha solo tiene 29 px de holgura a 1440×900, así que cambiaría la propiedad que R-3 estableció y que `e2e/layout.spec.ts` comprueba —que la ficha entera se lee sin abrir nada ni desplazarse— por una línea de texto de relleno.
  En su lugar, la advertencia de los esquemas de plegado se quedó en su paso: no es relleno sino un aviso de producción, y dentro de un paso no cuesta nada mientras esté cerrado.
- **El distintivo «Datos de ejemplo» es una afirmación escrita a mano, no derivada de los datos.**
  La línea de cada catálogo y el aviso de los esquemas sí salen del `source` del JSON, pero el distintivo no: si una imprenta reemplaza `public/config/` por sus datos reales, el distintivo miente hasta que alguien lo borre.
  Cerrarlo bien exige un campo declarado en la configuración, que es una decisión de Chris y no una que tome este incremento.
- **La barra repite en móvil tres cifras que también están en la columna de abajo.**
  La propuesta dice «y, debajo, el resto de los resultados», lo que sugiere quitarlas de la lista; ocultar filas concretas por CSS es frágil y la repetición no confunde, así que se dejaron.
- **El orden en móvil sigue siendo ficha → vista previa → resultados**, y el canvas dibuja la vista previa encima de la ficha.
  No estaba en la lista de lo no construido, pero sigue abierto.
- La cabecera pasa a dos filas a 390 px por culpa del distintivo.
  Se acepta: se desplaza fuera de la vista, y la barra que queda debajo no.

### Lo que R-6 arregló de paso

- La herramienta imprimía una misma magnitud de dos maneras: el peso de la tapa decía `18.53 g` junto a un peso interior que decía `70.6 g`, porque cada uno tenía su propio formateador.
  Ahora hay uno solo, a un decimal; el segundo decimal afirma una precisión que no tiene una herramienta que llama a cada cifra una referencia preliminar.

## El ancho de la pantalla — R-7

Petición de Chris el 2026-09-21: que la herramienta ocupe todo el ancho en escritorio, con las columnas laterales pegadas a los bordes de la pantalla.
Con el tope de 1440 px, una pantalla ancha dibujaba la herramienta como una losa flotando entre dos márgenes vacíos, con los filetes de las columnas laterales en el aire en vez de enmarcando la pantalla.

**Cerrado el 2026-09-21.**

- Se quita el tope de 1440 px de la rejilla, la cabecera y los dos avisos.
  Las columnas laterales conservan sus anchos, así que cada píxel que añade una pantalla más ancha es del centro.
- El centro se acota a 720 px y se centra.
  Sin acotarlo, a 2560 px la caja del SVG del pliego medía 1790 px de ancho para dibujar 284 px de pliego dentro, y el conmutador de cuatro vistas se repartía esos mismos 1790 px y se leía como una barra de herramientas y no como una elección entre cuatro.
  720 px es el ancho con el que se compusieron los dibujos: 1440 menos las dos columnas laterales.
- Una prueba de navegador a 2560 px fija la propiedad, porque a 1440 o menos las dos maquetaciones son indistinguibles.
  Probada devolviendo el tope y viendo la columna izquierda empezar en 560 px en vez de en 0.

### Lo que R-7 deja abierto

- **Los dibujos no crecen con la pantalla.**
  La página y el lomo están acotados en píxeles; el pliego y la tapa son SVG al 100 % del ancho pero limitados por su altura máxima, así que a partir de cierto ancho dejan de crecer.
  Una pantalla ancha compra margen alrededor del dibujo, no un dibujo más grande.
  Que el dibujo use el alto disponible es otro incremento, y toca los cuatro dibujos por separado.

## Decisiones pendientes

- 2026-09-19, decisión de Chris: el repo lleva arnés de navegador.
  Es la primera dependencia nueva desde el incremento 1 y entra con su aprobación explícita.
  Playwright Test, solo Chromium, en `e2e/`, separado de Vitest en vez de sustituirlo: los motores puros y el store se siguen probando en jsdom, que es más rápido y suficiente para ellos.
  Lo que cambia es que una afirmación sobre lo que la página mide ya no se verifica a mano.
- 2026-09-19, decisión de Chris: como la delegación quedó bloqueada por permisos, R-1 lo aplicó el capitán en vez de un builder.
  Es una excepción autorizada para ese incremento, no un cambio del modo de trabajo.
- 2026-09-19, decisión de Chris: se ejecuta `docs/UI-REDESIGN.md` en los incrementos R-1, R-2 y R-3, empezando por la estructura y sin tocar tokens.
  UX-7 y UX-8 siguen en pausa y quedan además reemplazados en su contenido: el Catálogo unificado del rediseño ocupa el lugar que iba a ocupar la pantalla de Configuración de UX-7.
- 2026-09-17, pendiente de confirmar con una imprenta real: el peso del cartón no se calcula porque el catálogo no declara su densidad; queda pendiente añadirla cuando se necesite.
- 2026-09-17, pendiente de confirmar con una imprenta real: las tolerancias de encajado de la tapa dura dependen de cada taller y no están modeladas.
- 2026-09-17, pendiente de confirmar con una imprenta real: la convención de dónde cae el sangrado en una tapa con solapas, en el borde exterior de la solapa porque la unión tapa-solapa es hendido y no corte, debe confirmarse contra un taller real.
- Chris decidió el 2026-09-16 no añadir un `spineType` a la encuadernación: el lomo plano se deriva de `nests`, que ya existe.
- 2026-09-16: la revisión de UX en `docs/UX-REVIEW.md` fue aprobada para ejecutarse después del incremento 4, empezando por sus tres primeros incrementos y dejando la capa de personalización al final; con el incremento 4 cerrado el 2026-09-17, es ahora ejecutable.
- 2026-09-19, decisión de Chris: la ejecución de `docs/UX-REVIEW.md` queda **en pausa** tras cerrar UX-6.
  UX-7, la pantalla de Configuración, y UX-8, exportar e importar, no se implementan hasta que Chris replantee la interfaz del sitio.
  No los retomes por inercia: los seis incrementos cerrados no implican que los dos restantes sigan siendo el plan correcto, porque UX-7 introduce una vista nueva y esa es justamente la decisión que está en revisión.
  UX-9, el editor visual de esquemas de plegado, nunca fue una tarea: el propio documento deja abierto si se hace.
- 2026-09-16, pendiente de confirmar con una imprenta real: el corrimiento se calcula siempre en grupos de 4 páginas, sin mirar el esquema de plegado elegido.
  Si un cuadernillo grapado se arma anidando pliegos plegados de 16 páginas, la unidad no es 4 y el corrimiento queda sobreestimado.
  Hasta confirmarlo, el valor mostrado debe leerse como una referencia preliminar más.
- Chris decidió el 2026-09-15 que la imposición por firmas incluye la numeración de páginas en el pliego según el esquema de plegado, además de la geometría y los conteos.
- Quedan pendientes, sin bloquear: tests adicionales del validador de configuración, y resolver el logo y el favicon con `BASE_URL` para despliegues en subrutas.
- 2026-09-17, observado por una revisión independiente de UX-5, sin bloquear: la coletilla «guardado solo para esta sesión» depende solo de que el almacenamiento no esté disponible, no de que una escritura falle a mitad de sesión.
  En ese caso el aviso general aparece pero la nota de la entrada recién añadida no queda calificada.
  Calificar todas las entradas personalizadas sería peor, porque marcaría como de sesión las que sí se guardaron; resolverlo bien exige seguimiento por entrada, candidato a UX-6 o UX-7.
- 2026-09-17, observado por la misma revisión, sin bloquear: una vez descartado el aviso de persistencia, no vuelve a aparecer en esa sesión aunque ocurra un fallo de escritura nuevo y distinto.
  La §3.5 solo pide que sea descartable, así que cumple; pero un fallo nuevo es información nueva y hoy queda callado.
- 2026-09-17, decisión de alcance de UX-5: se persisten los cinco catálogos personalizados, no la selección actual.
  Tras recargar, una prensa personalizada sigue en el desplegable pero no queda seleccionada, así que quien trabaje siempre con su propia prensa vuelve a elegirla en cada sesión.
  Persistir preferencias fue un no objetivo explícito del incremento 1; cambiarlo es otra decisión.
- 2026-09-17, pendiente de verificar en un navegador: el área táctil ampliada del botón de eliminar gramaje personalizado se extiende 12 px hacia la derecha, hacia su vecino, el botón de añadir.
  Si la invade, un clic dirigido a añadir borraría un gramaje.
  No se pudo medir porque exige un gramaje personalizado en pantalla y el flujo de alta no se completó; el equivalente para pliegos usa 2 px y no corre ese riesgo.
- Los esquemas de plegado entregados son ejemplos construidos a mano: su emparejamiento de páginas está verificado, pero su convención de plegado debe confirmarse contra un pliego doblado real.
- El motor de firmas no considera imponer varias firmas lado a lado en un mismo pliego, lo que desaprovecha pliegos grandes con páginas pequeñas; es candidato a un incremento posterior.
