# Los siete motores

Los motores viven en `src/engine/` y son funciones puras.
Reciben los datos de configuración como argumentos, solo importan tipos de `src/types/index.ts`, y no leen el DOM, el almacenamiento ni la red.
Todos los milímetros son `number`; los gramajes, g/m²; los calibres, micrones.

Los motores que calculan rechazan una entrada no finita o fuera de rango con un `RangeError` cuyo mensaje, en español, dice qué campo falló.
La excepción es `folding.ts`, que devuelve una secuencia de dobleces inválida como `{ ok: false, reason }` y no lanza.
Un resultado que es una respuesta normal y no un error de programación, como una encuadernación que rechaza un número de páginas, se devuelve como dato (`ok: false` con su razón), no se lanza.
El store captura los `RangeError` y los convierte en el texto de error de cada resultado (ver `state.md`).

## Cómo se encadenan

El store los llama en este orden en cada recálculo, y dos de los pasos consumen lo que produjo uno anterior:

1. `calculateImposition`, con el pliego elegido; no depende de los demás.
2. `calculateSpineAndWeight`.
3. `planSignatures`; tampoco depende de los anteriores.
4. `validatePageCount`, `spineWithBinding` y `creepCompensation`.
   `validatePageCount` usa las páginas por firma del esquema que eligió el paso 3; `spineWithBinding` usa el lomo del paso 2; `creepCompensation` usa el total de páginas y el calibre del papel, y no depende de los pasos anteriores.
5. `planCover`, con el lomo final que devolvió `spineWithBinding`.

`folding.ts` no está en la cadena: ver más abajo.

## `units.ts`

Conversión y formato; no calcula resultados del libro.

- Conversiones entre milímetros, pulgadas y puntos (`mmToInches`, `inchesToMm`, `mmToPoints`, `pointsToMm`), con 25,4 mm por pulgada y 72 puntos por pulgada.
- `roundTo`, `isPositiveFinite` e `isNonNegativeFinite`, que los componentes usan para decidir si una medida se puede dibujar.
- Formateadores de presentación: `formatMm`, `formatWeight`, `formatWeightParts`, `formatArea`, `formatRoundedValue`, `formatMeasurement`.
- `getPageDisplayDimensions`: página, sangrado y unidad en el sistema elegido, métrico o imperial.
  Los cálculos siempre se hacen en milímetros; el sistema de unidades solo cambia lo que se muestra.

## `spine.ts`

- `calculateSpineThickness(totalPages, caliper_microns)` = `ceil(totalPages / 2) × caliper / 1000`, en milímetros.
  Una última página impar consume una hoja completa.
- `calculateWeight(width, height, totalPages, grammage)` = `ceil(totalPages / 2) × ancho_m × alto_m × gramaje`, en gramos.
  Es el peso del papel interior, con la página sin sangrado.
- `calculateSpineAndWeight` devuelve ambos como `{ thickness_mm, totalWeight_g }`.

El calibre que recibe es el del gramaje elegido en el papel interior.
Este es el lomo del papel solo: el aporte de la encuadernación lo suma `binding.ts`.

## `imposition.ts`

`calculateImposition(pageW, pageH, sheetW, sheetH, orientation)` mide cuántas páginas caben en una cuadrícula uniforme sobre un pliego, en orientación normal y girada.

- `orientation` es `'auto'` (la que más páginas coloque), `'normal'` o `'rotated'`.
- Devuelve páginas por cara, columnas, filas, si va girada, el porcentaje de área no utilizada, el área usada y total, y si la orientación elegida es la mejor.
- Las posiciones para el dibujo se acotan a 250; `previewTruncated` avisa si había más.
- El store le pasa la página con sangrado.
  No usa los márgenes de la prensa ni los esquemas de plegado: es solo el aprovechamiento geométrico del pliego, distinto del plan de firmas.

## `signatures.ts`

`planSignatures` decide qué esquemas de plegado sirven para imprimir este libro en esta prensa con este pliego, y elige el que menos papel desperdicia.

- Rechaza el par pliego y prensa si el pliego no cabe en la prensa en ninguna orientación (`sheetFitsPress`; razón `sheet-exceeds-press`), y si los márgenes dejan un área imprimible no positiva (`margins-exceed-sheet`).
- El área imprimible es `ancho − 2 × margen lateral` por `alto − margen de pinza − margen de cola`.
- Cada esquema es una cuadrícula `cols × rows` de celdas del tamaño de la página con sangrado, separadas por la calle de la prensa.
  Un esquema entra si la cuadrícula cabe en alguna de las dos orientaciones de la página; si caben las dos, usa la normal.
- Por cada esquema que entra calcula `signatures = ceil(totalPages / pagesPerSignature)`, `blankPages = signatures × pagesPerSignature − totalPages`, `sheetsPerCopy`, el área usada y el porcentaje de área imprimible no utilizada.
- `printingMode` es `'tiro-retiro'` si el esquema se puede imprimir con una sola plancha dando la vuelta al pliego (en cada fila, la posición espejada del dorso tiene la misma rotación que la del frente), y `'planchas-separadas'` si no.
  Es una simplificación geométrica, no una simulación de preprensa.
- `selectBestOption` elige por mayor área usada; en empate, el de más páginas por firma; en un segundo empate, el id menor, para que el resultado no dependa del orden del arreglo.
- `layoutSide(option, 'front' | 'back')` calcula la posición de cada celda para dibujar el pliego, componiendo la rotación propia de la celda con el giro de 90° de la página si lo hubo.
- Un esquema cuyas columnas, filas o páginas por firma no son enteros positivos se descarta sin impedir que se evalúen los demás.
  Uno cuyas listas de posiciones no tienen `cols × rows` elementos no se descarta aquí, y `layoutSide` lanza un `RangeError` al dibujarlo.

Que el usuario elija un esquema concreto lo resuelve el store, no el motor.

## `folding.ts`

Deriva un esquema de plegado a partir de los dobleces que lo producen, en vez de pedir que alguien escriba la cuadrícula.

- `foldingSchemeFromFolds(folds)` recibe una secuencia de dobleces, cada uno con un eje (`vertical` u `horizontal`) y cuál mitad se trae sobre la otra, y devuelve las columnas, filas, páginas por firma y la numeración y rotación de cada posición del tiro y del retiro, más qué cara queda hacia afuera.
  Admite de 1 a 6 dobleces.
  Las columnas son `2^(dobleces verticales)`, las filas `2^(dobleces horizontales)`, y las páginas por firma `cols × rows × 2`.
- `readByFolding(scheme, folds, outward)` hace el camino contrario: dobla un esquema dado y devuelve el orden en que salen las páginas; un esquema correcto sale `1, 2, 3, …`.
- La convención de volteo del dorso es que el pliego gira sobre su eje vertical: la posición `(fila, col)` del frente tiene su dorso en `(fila, cols − 1 − col)`.
  Es la misma que usa `signatures.ts` para detectar el modo de impresión y la misma que el validador hace cumplir.

**Hoy ningún código de producción importa este motor.**
Lo usan solo las pruebas de `src/__tests__/folding.test.ts`, que comprueban que los dos esquemas de `esquemas.json` son exactamente lo que derivan sus dobleces, rotaciones incluidas, y que se leen en orden.
No existe todavía una pantalla ni una capa de usuario para dar de alta esquemas: los esquemas de plegado son de solo lectura en el catálogo.

## `binding.ts`

Reglas de cada método de encuadernación, leídas de su entrada del catálogo.

- `validatePageCount(binding, totalPages, pagesPerSignature)` devuelve `{ ok: true }` o `{ ok: false, reason, message, nearestBelow, nearestAbove }`.
  Las razones se evalúan en este orden, porque un conteo puede incumplir varias reglas y solo se reporta una: `not-multiple` (el múltiplo propio del método), `not-signature-multiple` (el múltiplo del tamaño de firma, solo si el método lo exige y hay un plan de firmas), `below-min` y `above-max`.
  `nearestBelow` y `nearestAbove` son los conteos válidos más cercanos dentro del rango.
- `pageCountStep(binding, pagesPerSignature)` es el menor salto de páginas que sigue cumpliendo el método: su múltiplo, o el mínimo común múltiplo de ese y el tamaño de firma si el método lo exige.
  El contador de páginas de la interfaz suma y resta de a ese paso.
  `pagesPerSignature` es `null` cuando no hay plan de firmas, y entonces la regla de firma no se evalúa.
- `spineWithBinding(interior_mm, binding)` devuelve el lomo del papel, el aporte del método (`spineAllowance_mm`) y su suma, mostrados por separado.
- `creepCompensation(binding, totalPages, caliper_microns)` valida primero el total de páginas, y devuelve `null` si el método no anida pliegos (`nests: false`).
  Si anida, exige un total múltiplo de 4 y calcula `nestedSheets = totalPages / 4` y el corrimiento máximo `nestedSheets × caliper / 1000`; la hoja más interior es la referencia y su corrimiento es 0.
  El cálculo no mira el esquema de plegado: la unidad es siempre el grupo de 4 páginas.

Que un método produzca un lomo plano y cuadrado o solo un pliegue no es un campo propio: se deriva de `nests` (`hasFlatSpine = !nests`).

## `cover.ts`

`planCover({ pageWidth_mm, pageHeight_mm, bleed_mm, spineTotal_mm, bindingHasFlatSpine, cover })` devuelve `{ ok: true, cover }` con el resultado de una tapa blanda o dura, o `{ ok: false, reason, message }`.

- **Tapa blanda.**
  El alto del pliego es el de la página más el sangrado a cada lado.
  El ancho es `2 × solapa + 2 × panel + lomo`.
  Con solapas, el sangrado va en el borde exterior de la solapa, porque la unión entre solapa y tapa es un doblez y no un corte, y el panel mide la página sin sangrado.
  Sin solapas, el panel lleva el sangrado.
  Si el método de encuadernación no tiene lomo plano, el lomo cuenta como 0.
  Devuelve el área y el peso del papel de tapa, a partir de su gramaje.
- **Tapa dura.**
  Ignora el sangrado del libro: el doblez de forro (`turnIn_mm`) cumple ese papel.
  Calcula el cartón lateral (`ancho de página + ceja − canal de bisagra` por `alto + 2 × ceja`), el cartón de lomo (`lomo + 2 × grosor del cartón`) y el forro, con sus canales y dobleces.
  Devuelve el área y el peso del forro, y el área del cartón por separado (lateral y de lomo), pero no su peso: el catálogo no declara una densidad de cartón.
- **Razones de rechazo**: `binding-has-no-flat-spine` (una tapa dura con un método que anida pliegos), `flap-exceeds-page` (una tapa blanda cuya solapa es igual o mayor que la página) y `hinge-exceeds-board` (un canal de bisagra que deja el cartón lateral con ancho cero o negativo).

## El porqué de cada motor

Esta página dice qué calcula cada motor y cómo.
Por qué el oficio lo hace así, y qué de eso está confirmado y qué es un supuesto, está en `context/domain/`:

- `spine.ts`: `../domain/paper.md`.
- `imposition.ts`: `../domain/imposition.md`.
- `signatures.ts` y `folding.ts`: `../domain/imposition.md` y `../domain/signatures.md`.
- `binding.ts`: `../domain/binding.md`.
- `cover.ts`: `../domain/cover.md`.
- El vocabulario de todos: `../domain/terminology.md`.
