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

Por eso R-2 va en dos entregas: primero las tres extracciones que no tocan el store, que fijan el patrón; después la del lomo, que sí lo toca y lleva revisión cruzada.

No objetivo: cambiar la disposición, los tokens o cualquier cifra.

Aceptación: la página renderizada es idéntica a la de antes del incremento, `npm run test:browser` sigue en verde, y los tests, `tsc` y el build siguen en cero.

### R-3 — Las tres columnas

Objetivo: componer ficha, vista previa y resultados en tres columnas a partir de las regiones de R-2, con el acordeón de cinco pasos y el selector de vista.

No objetivos: el Catálogo unificado, los tokens nuevos y la paleta.
Esos vienen después, porque R-3 existe para probar la hipótesis antes de invertir en ellos.

Aceptación, como specs de `e2e/`: a 1440 px la página no se desplaza en vertical y solo se desplazan las columnas; a 390 px sigue sin haber desplazamiento horizontal; ningún control del inventario desaparece, comprobado contra la tabla de `docs/UI-REDESIGN.md`.

### Rollback

- Revertir el único commit del incremento que falle; los tres son independientes en ese orden.

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
