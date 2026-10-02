# Backlog heredado

Índice único de lo que el plan anterior dejó abierto, con una línea por pendiente y enlace a la sección donde está explicado.
No es una copia: cada entrada resume en una frase y manda al texto original, que sigue siendo la fuente.
Nada de lo que está aquí es compromiso.
Un pendiente sale del legado solo cuando Chris lo promueve a `docs/PLAN.md`, y el legado no se edita para marcarlo.

## Cómo leerlo

- Cada entrada tiene un id, el estado **tal como lo declara el documento de origen**, y la línea de ese documento (`L123`) en la versión congelada.
  No verifiqué los estados contra el código; una entrada «abierta» puede haberse cerrado después en otro incremento, y se dice cuando el propio plan da pistas.
  Antes de promover una, compruébala contra `src/`.
- Estados:
  **supuesto de imprenta** (hay que confirmarlo con una imprenta real),
  **abierto**,
  **aplazado** (Chris lo dejó fuera a propósito),
  **decisión tomada** (registro, no pide acción),
  **cerrado** (el origen lo tacha o dice que se cerró) y
  **observación** (algo medido o anotado que conviene saber).
- Los cinco supuestos de imprenta son `SUP-1` a `SUP-5`.
  Son el cuestionario de la primera entrevista según `docs/decisions/2026-09-24-pliegostack-pausa-la-interfaz-y-replantea-el-plan-desde-una-.md`.
- Las secciones de la parte B son las que el plan anterior dejó dentro de sus incrementos.
  Son trece y no nueve, como estimó la propuesta de tres capas: al indexarlas aparecieron cuatro más con pendientes reales.
- Cuando dos orígenes cuentan el mismo pendiente, cada uno tiene su entrada y la segunda dice `= id`.

## A. «Decisiones pendientes» de `PLAN.md`

Las diecinueve viñetas, en su orden.
Origen: [`PLAN.md`, «Decisiones pendientes»](PLAN.md#decisiones-pendientes).

- `A-01` **decisión tomada**, L1274: el repo lleva arnés de navegador, Playwright solo Chromium en `e2e/`, aprobado el 2026-09-19.
- `A-02` **decisión tomada**, L1278: R-1 lo aplicó el capitán por una excepción autorizada el 2026-09-19, no un cambio del modo de trabajo.
- `A-03` **decisión tomada**, L1280: se ejecuta el rediseño en R-1 a R-3 sin tocar tokens; el Catálogo unificado ocupa el lugar de la pantalla de Configuración de UX-7.
- `A-04` **supuesto de imprenta** `SUP-1` ([concepto](../../context/domain/cover.md#densidad-del-cartón)), L1282: el peso del cartón no se calcula porque el catálogo no declara su densidad.
  Lo repite [«Incremento 4», no objetivos](PLAN.md#incremento-4--tapa-blanda-y-dura), L185.
- `A-05` **supuesto de imprenta** `SUP-2` ([concepto](../../context/domain/cover.md#tolerancias-de-encajado)), L1283: las tolerancias de encajado de la tapa dura dependen de cada taller y no están modeladas.
- `A-06` **supuesto de imprenta** `SUP-3` ([concepto](../../context/domain/cover.md#sangrado-con-solapas)), L1284: dónde cae el sangrado en una tapa con solapas, en el borde exterior de la solapa porque la unión es hendido.
- `A-07` **decisión tomada**, L1285: no añadir `spineType` a la encuadernación; el lomo plano se deriva de `nests`.
- `A-08` **decisión tomada**, L1286: la revisión de UX se aprobó el 2026-09-16 para ejecutarse tras el incremento 4; se ejecutó hasta UX-6.
- `A-09` **abierto**, L1287: UX-7, la pantalla de Configuración, y UX-8, exportar e importar, quedaron en pausa desde el 2026-09-19; UX-9, el editor visual de esquemas, nunca fue una tarea.
  Definidos en [`UX-REVIEW.md`, «Secuencia de implementación»](UX-REVIEW.md#7-secuencia-de-implementación).
  Relacionados: `UI-REDESIGN.md` punto 4 de «Huecos cerrados» (exportar e importar sin sitio) y `UI-INVENTORY.md` punto 3 de «Puntos abiertos» (el aviso de huérfanos no puede ofrecer exportar).
- `A-10` **supuesto de imprenta** `SUP-4` ([concepto](../../context/domain/binding.md#el-corrimiento)), L1291: el corrimiento se calcula siempre en grupos de 4 páginas, sin mirar el esquema; con pliegos de 16 anidados queda sobreestimado.
- `A-11` **decisión tomada**, L1294: la imposición incluye la numeración de páginas en el pliego según el esquema, decidido el 2026-09-15.
- `A-12` **abierto**, L1295: faltan tests adicionales del validador de configuración, y resolver el logo y el favicon con `BASE_URL` para despliegues en subrutas.
- `A-13` **abierto**, L1296: la coletilla «guardado solo para esta sesión» no reacciona a un fallo de escritura a mitad de sesión; exige seguimiento por entrada.
  `UI-INVENTORY.md`, punto 4 de «Puntos abiertos», es el mismo.
- `A-14` **abierto**, L1299: descartado el aviso de persistencia, no reaparece ante un fallo nuevo.
  `UI-INVENTORY.md`, punto 5 de «Puntos abiertos», es el mismo.
- `A-15` **decisión tomada** con una consecuencia abierta, L1301: se persisten los cinco catálogos personalizados y no la selección actual; cambiarlo es otra decisión de Chris.
  `UI-INVENTORY.md`, punto 1 de «Puntos abiertos», y `C-02` son el mismo.
- `A-16` **cerrado**, L1304: el área táctil del botón de eliminar gramaje invadía a su vecino; sin objeto desde R-4b.
  `UI-INVENTORY.md`, punto 2 de «Puntos abiertos», es el mismo.
- `A-17` **cerrado**, L1306: los esquemas de plegado entregados no superaban la derivación por dobleces; cerrado el 2026-09-23 en R-27.
- `A-18` **supuesto de imprenta** `SUP-5` ([concepto](../../context/domain/signatures.md#la-firma-de-8-páginas)), L1308: cuál de los dos dobleces se salta para hacer una firma de 8 páginas, pendiente de confirmar doblando un papel; `esquemas.json` sigue `provisional`.
- `A-19` **abierto**, L1311: el motor de firmas no considera imponer varias firmas lado a lado en un mismo pliego; candidato a un incremento posterior.

## B. Secciones de cosas abiertas dentro del plan

Trece secciones de `PLAN.md`, en su orden.

### B-1. [Puntos abiertos que dejó la revisión de R-3a](PLAN.md#puntos-abiertos-que-dejó-la-revisión-de-r-3a), L292

- `B-1.1` **abierto** en esa sección: la cabecera ocupa 161 px de 900; reducirla es restyle.
- `B-1.2` **cerrado** según `B-5` (L463): los resultados de tapa dura no los comprobaba ningún test; R-3 lo cubrió.
- `B-1.3` **cerrado** según `B-5` (L467): las tarjetas de resultado no compartían estilo; R-5 las dibuja con `ResultList`.

### B-2. [Lo que falta para cerrar R-2](PLAN.md#lo-que-falta-para-cerrar-r-2), L301

- `B-2.1` **cerrado**, L303: las vistas previas, tres de cuatro en R-2; la del pliego en R-3c (L376).
- `B-2.2` **cerrado**, L311: la unificación de `hasFlatSpine` y el guardián del estado de entrada inválida.
- `B-2.3` **cerrado**, L312 y L321: desacoplar `SpineResults` de la geometría del dibujo; el ternario quedó deshecho.
- `B-2.4` **observación**, L332: un caso extremo de la nota de fallback de tapa quedó «inalcanzable» afirmado y no demostrado.

### B-3. [Lo que el rediseño deja sin construir](PLAN.md#lo-que-el-rediseño-deja-sin-construir), L427

- `B-3.1` **cerrado** en R-6, L431: la barra de resultados fija a 390 px.
- `B-3.2` **cerrado** en R-6, L432: la sección desplegable «Cómo se calcula».
- `B-3.3` **cerrado** en R-6 y revisado en R-30, L433: un único distintivo «Datos de ejemplo» en la cabecera.
- `B-3.4` **cerrado** en R-6, L434: el distintivo de origen junto a la etiqueta del campo.
- `B-3.5` **decisión tomada**, L435: la cara mostrada se queda como desplegable, por ahora, resuelto por Chris el 2026-09-21.

### B-4. [Lo que el catálogo dejó abierto](PLAN.md#lo-que-el-catálogo-dejó-abierto), L438

- `B-4.1` **abierto** al 2026-09-21, L442: una entrada propia no se edita, solo se elimina y se vuelve a añadir.
  Las secciones posteriores mencionan `editOwn` (L749), así que puede estar resuelto: verifícalo.
  Lo repite [«Catálogo unificado — R-4»](PLAN.md#catálogo-unificado--r-4), L396.
- `B-4.2` **abierto** al 2026-09-21, L443: el formulario edita la entrada seleccionada y la lista no deja elegir otra ni marca cuál es.
- `B-4.3` **abierto** al 2026-09-21, L444: la prueba de reconciliación del guardián perdió fuerza con el modal; R-25 sacó el editor del modal, así que puede haber cambiado.
- `B-4.4` **abierto** al 2026-09-21, L445: el recorrido del guardián no abre los formularios de alta.
- `B-4.5` **aplazado** por Chris el 2026-09-21, L446: el test de tamaños mide el catálogo y no los controles de los pasos; los segmentos siguen en 23 a 25 px y los campos en 35, contra los 40 y 44 que pide la propuesta.

### B-5. [Puntos abiertos tras R-3](PLAN.md#puntos-abiertos-tras-r-3), L459

- `B-5.1` **cerrado**, L463: los resultados de tapa dura.
  Es `B-1.2`.
- `B-5.2` **abierto**, L465: los formularios condicionales de alta quedan fuera del inventario.
  Es `B-4.4`.
- `B-5.3` **cerrado**, L467: las tarjetas de resultado no comparten estilo.
  Es `B-1.3`.
- `B-5.4` **abierto**, L469: dos preguntas de accesibilidad sin respuesta, si un `<h2>` dentro de un `<summary>` se anuncia bien y si `aria-pressed` es lo correcto frente a un grupo de radio; exigen un lector de pantalla real.
- `B-5.5` **cerrado**, L471: la etiqueta «NÚMERO DE PÁGINAS» estaba en mayúsculas en el JSX.

### B-6. [Lo que R-6 no construyó, y por qué](PLAN.md#lo-que-r-6-no-construyó-y-por-qué), L503

- `B-6.1` **abierto**, L505: la nota al pie de la ficha no se construyó porque ocupa 140 px y la ficha solo tiene 29 px de holgura a 1440×900.
- `B-6.2` **cerrado**, L508: el distintivo «Datos de ejemplo» era una afirmación escrita a mano; Chris eligió el campo el 2026-09-23 (R-30).
- `B-6.3` **abierto**, L512: la barra repite en móvil tres cifras que también están en la columna de abajo.
- `B-6.4` **abierto**, L514: el orden en móvil sigue siendo ficha, vista previa, resultados.
- `B-6.5` **decisión tomada**, L516: la cabecera pasa a dos filas a 390 px por el distintivo, aceptado.

### B-7. [Lo que R-7 deja abierto](PLAN.md#lo-que-r-7-deja-abierto), L539

- `B-7.1` **abierto**, L541: los dibujos no crecen con la pantalla; que usen el alto disponible es otro incremento y toca los cuatro dibujos.

### B-8. [Lo que R-9 dejó anotado](PLAN.md#lo-que-r-9-dejó-anotado), L632

- `B-8.1` **observación**, L634: las 34 filas de los catálogos son controles nuevos que el guardián inventaría por nombre accesible, y ese nombre lleva los datos de `public/config/`.
- `B-8.2` **abierto**, L636: cada fila se nombra con tres celdas separadas por comas; pegadas, un lector de pantalla anuncia «Bond3 gramajesde fábrica».

### B-9. [Lo que estos incrementos no tocan](PLAN.md#lo-que-estos-incrementos-no-tocan), L638

- `B-9.1` **abierto**, L640: los esquemas de plegado siguen siendo solo lectura; darlos de alta necesita el editor visual de UX-9.
  Es el mismo tema que `A-09` y `B-11.1`.
- `B-9.2` **aplazado**, L649: móvil y accesibilidad quedan congelados por decisión de Chris hasta que el diseño se cierre.

### B-10. [Un hueco que se ve desde aquí](PLAN.md#un-hueco-que-se-ve-desde-aquí), L651

- `B-10.1` **abierto**, L653: `patchPress` no rechaza un nombre repetido como `addCustomPress`, y lo mismo en pliegos, encuadernaciones y proporciones.

### B-11. [Lo que falta de R-12](PLAN.md#lo-que-falta-de-r-12), L702

- `B-11.1` **abierto**, L704: dar de alta un esquema desde el Catálogo eligiendo los dobleces; el motor ya está, faltan la capa de usuario y la pantalla.
- `B-11.2` **abierto**, L706: la maqueta imprimible, que es lo único que zanja la convención de volteo contra la realidad.

### B-12. [Lo que este bloque deja abierto](PLAN.md#lo-que-este-bloque-deja-abierto), L896

- `B-12.1` **decisión tomada**, L898: el recorte a tres proporciones se quitó en R-13; queda anotado por si Chris prefiere lo contrario.
- `B-12.2` **abierto**, L901: editar una medida con una proporción activa la pasa a «Manual», y el lienzo mantiene la razón; hacerlo bien exige partir `setPageDimensions` en `setPageWidth` y `setPageHeight`.

### B-13. [Lo que esta pasada no toca](PLAN.md#lo-que-esta-pasada-no-toca), L1264

- `B-13.1` **abierto**, L1266: el orden en móvil sigue siendo ficha, vista central.
  Es `B-6.4`.
- `B-13.2` **abierto**, L1269: la barra sigue repitiendo tres cifras.
  Es `B-6.3`.
- `B-13.3` **aplazado**, L1270: accesibilidad, que Chris dejó para el final; lo primero es el editor del catálogo, que no atrapa el tabulador como hacía el `<dialog>`.

## C. «Decisiones abiertas» de `UI-REDESIGN.md`

Origen: [`UI-REDESIGN.md`, «Decisiones abiertas»](UI-REDESIGN.md#decisiones-abiertas), L124.

- `C-01` **cerrado**, L126: si «Cara mostrada» debía seguir en la ficha; la premisa era falsa, es un `useState` local.
- `C-02` **abierto**, L130: si la selección actual debe persistirse.
  Es `A-15`.
- `C-03` **abierto** en el origen, L131: que el acordeón deje un solo paso abierto a la vez es una hipótesis; R-19 quitó la exclusión entre secciones (L933).
- `C-04` **abierto**, L132: la vista a 1024 px está descrita, no dibujada.

## D. Fuera de las listas del plan

- `D-01` **decisión tomada**: el incremento 5, tirada, merma y costo, que `PLAN.md` daba por siguiente (L16), se rechazó el 2026-09-24 porque el costo depende de precios y mermas que solo una imprenta real conoce.
  Ver [`docs/decisions/2026-09-24-pliegostack-pausa-la-interfaz-y-replantea-el-plan-desde-una-.md`](../decisions/2026-09-24-pliegostack-pausa-la-interfaz-y-replantea-el-plan-desde-una-.md).

Se dejaron fuera a propósito: «Lo que no se sostuvo» (L743 de `PLAN.md`), que anota afirmaciones de una revisión que resultaron falsas, y las secciones «Lo que R-6 arregló de paso», «Lo que R-10 arregló de paso» y «Lo que R-11 añadió», que son registro de lo hecho y no de lo pendiente.
