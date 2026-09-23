# Configuración en runtime

## Propósito

PliegoStack carga su catálogo de sustratos, pliegos, proporciones y valores por defecto desde archivos JSON en `public/config/` en vez de compilarlos en el código.
Esto permite reemplazar los datos de una imprenta real, sin recompilar la aplicación, editando esos archivos y recargando el navegador.
Los valores incluidos en el repositorio son de ejemplo.
Deben reemplazarse por datos reales de una imprenta antes de usar la herramienta en producción.

## Archivos

La aplicación carga los siete archivos en paralelo al iniciar, usando `import.meta.env.BASE_URL` como prefijo para que funcione también en despliegues bajo una subruta.
Cada solicitud se hace con `cache: 'no-cache'`, para que una recarga siempre vuelva a pedir el archivo al servidor en vez de servir una copia local desactualizada.
Cada solicitud tiene un límite de 10 segundos; si el servidor no responde a tiempo, la aplicación cancela la solicitud y reporta ese archivo como fallido en vez de dejar "Cargando configuración…" indefinidamente.
Si algún archivo falta, no responde a tiempo, devuelve un código distinto de 2xx, o no contiene JSON válido, la aplicación muestra un estado de error accesible en vez de quedar en blanco.
Algunos servidores estáticos responden con código 200 y una página HTML (la aplicación misma) cuando el archivo pedido no existe; la aplicación detecta esa respuesta por su tipo de contenido y la reporta como "archivo no encontrado" en vez de como JSON inválido.
Cuando un archivo falla al cargarse, los demás que sí cargaron se validan igual, para no ocultar sus propios errores detrás del archivo que falló; solo se omiten las comprobaciones que necesitan el archivo faltante (por ejemplo, si `pliegos.json` no carga, no se puede comprobar si `defaults.sheetSizeId` existe).
Las claves adicionales que no se documentan aquí se ignoran.

### `public/config/sustratos.json`

Contiene la lista de sustratos (tipos de papel y cartulina) disponibles.

```json
{
  "source": "Valores de ejemplo; reemplazar por datos reales de la imprenta.",
  "provisional": true,
  "substrates": [
    {
      "id": "couche_matte",
      "name": "Couché Mate",
      "type": "couche_matte",
      "description": "Papel estucado mate.",
      "options": [
        { "grammage": 150, "caliper": 120 }
      ]
    }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al calibre declarado en el panel de sustrato, como "Fuente: `<source>` (config/sustratos.json)", para que la interfaz nunca presente estos valores como datos certificados sin decir de dónde salieron.
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `substrates`: arreglo no vacío de sustratos.
- `id`: identificador único del sustrato, usado como referencia desde `formatos.json` y desde el store.
- `name`: nombre visible en el selector de sustrato.
- `type`: etiqueta de tipo de sustrato, libre, usada solo como dato descriptivo.
- `description`: texto explicativo mostrado bajo el selector.
- `options`: arreglo no vacío de combinaciones de gramaje y calibre disponibles para ese sustrato.
  El orden importa: `options[0]` es el gramaje que la aplicación selecciona automáticamente al cambiar de sustrato, y también el que recupera al eliminar el último gramaje personalizado de ese sustrato.
- `options[].grammage`: gramaje del papel, en gramos por metro cuadrado (g/m²).
  Debe ser único dentro del mismo sustrato.
- `options[].caliper`: calibre (grosor) de una hoja de ese gramaje, en micrones (μm).

### `public/config/pliegos.json`

Contiene los tamaños de pliego de máquina disponibles para la imposición.

```json
{
  "source": "Valores de ejemplo; reemplazar por datos reales de la imprenta.",
  "provisional": true,
  "sheetSizes": [
    { "id": "tabloide", "name": "Doble Carta (Tabloid)", "width_mm": 432, "height_mm": 279 }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de pliego, como "Fuente: `<source>` (config/pliegos.json)".
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `sheetSizes`: arreglo no vacío de pliegos.
  El orden importa: `sheetSizes[0]` es el pliego al que la aplicación vuelve si se elimina el pliego personalizado que estaba seleccionado.
- `id`: identificador único del pliego, usado como referencia desde `formatos.json` y desde el store.
- `name`: nombre visible en el selector de pliego.
- `width_mm`: ancho del pliego, en milímetros.
- `height_mm`: alto del pliego, en milímetros.

### `public/config/maquinas.json`

Contiene las prensas disponibles para la imposición por firmas: su formato máximo de pliego y los márgenes que la máquina necesita alrededor de cada pliego.

```json
{
  "source": "Valores de ejemplo; reemplazar por datos reales de la imprenta.",
  "provisional": true,
  "presses": [
    {
      "id": "prensa_70x100",
      "name": "Prensa formato 70×100",
      "maxSheetWidth_mm": 720,
      "maxSheetHeight_mm": 1020,
      "gripperMargin_mm": 12,
      "sideMargin_mm": 10,
      "tailMargin_mm": 10,
      "gutter_mm": 5
    }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de prensa, como "Fuente: `<source>` (config/maquinas.json)".
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `presses`: arreglo no vacío de prensas.
- `id`: identificador único de la prensa, usado como referencia desde `formatos.json` (`defaults.pressId`) y desde el store.
- `name`: nombre visible en el selector de prensa.
- `maxSheetWidth_mm`: ancho máximo de pliego que admite la prensa, en milímetros.
- `maxSheetHeight_mm`: alto máximo de pliego que admite la prensa, en milímetros.
  Un pliego que no quepa en ninguna de las dos orientaciones dentro de `maxSheetWidth_mm` × `maxSheetHeight_mm` queda fuera de la imposición por firmas para esa prensa.
- `gripperMargin_mm`: margen de pinza, en milímetros, que la prensa reserva en un borde del pliego para sujetarlo durante la impresión y que no se puede imprimir.
- `sideMargin_mm`: margen lateral, en milímetros, reservado a cada lado del pliego.
- `tailMargin_mm`: margen de cola, en milímetros, reservado en el borde opuesto a la pinza.
- `gutter_mm`: calle entre páginas, en milímetros, que separa una página de la siguiente dentro de la misma cara del pliego.
  El área imprimible resultante es `anchoDelPliego - 2 × sideMargin_mm` por `altoDelPliego - gripperMargin_mm - tailMargin_mm`; debe quedar positiva en ambas dimensiones.

### `public/config/esquemas.json`

Contiene los esquemas de plegado disponibles: cuántas páginas caben en una firma, la rejilla de posiciones en el pliego y el número de página y la rotación de cada posición, para el tiro (`front`) y el retiro (`back`).

```json
{
  "source": "Esquema de 16 páginas confirmado por Chris el 2026-09-23 contra un pliego doblado real (se dobla de abajo hacia arriba, luego la izquierda sobre la derecha, luego de arriba hacia abajo). El de 8 páginas es la misma secuencia con un pliegue menos y está pendiente de confirmar.",
  "provisional": true,
  "foldingSchemes": [
    {
      "id": "esquema_8pp",
      "name": "Firma de 8 páginas (pliego doblado 2 veces)",
      "pagesPerSignature": 8,
      "cols": 2,
      "rows": 2,
      "sides": {
        "front": [
          { "page": 8, "rotation": 0 },
          { "page": 1, "rotation": 0 },
          { "page": 6, "rotation": 180 },
          { "page": 3, "rotation": 180 }
        ],
        "back": [
          { "page": 2, "rotation": 0 },
          { "page": 7, "rotation": 0 },
          { "page": 4, "rotation": 180 },
          { "page": 5, "rotation": 180 }
        ]
      }
    }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de esquema de plegado, como "Fuente: `<source>` (config/esquemas.json)".
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `foldingSchemes`: arreglo no vacío de esquemas de plegado.
- `id`: identificador único del esquema, usado como referencia desde el store (la selección manual de esquema) y, potencialmente, desde otra configuración futura.
- `name`: nombre visible en el selector de esquema de plegado.
- `pagesPerSignature`: número de páginas que caben en una firma completa (tiro y retiro juntos), entero positivo, múltiplo de 4 y como máximo 128.
- `cols` y `rows`: columnas y filas de la rejilla de posiciones en cada cara del pliego; su producto debe ser igual a la mitad de `pagesPerSignature`, porque cada posición de la rejilla es una página en el tiro y otra en el retiro.
- `sides.front` y `sides.back`: arreglos de exactamente `cols × rows` posiciones cada uno, en orden de fila principal ("row-major"), es decir, la posición 0 es la esquina superior izquierda de esa cara, la posición 1 es la siguiente columna de la misma fila, y así hasta completar cada fila antes de pasar a la siguiente.
- `sides.front[].page` y `sides.back[].page`: número de página que se imprime en esa posición, entero entre 1 y `pagesPerSignature`.
  Entre `sides.front` y `sides.back` juntos, cada página de la firma debe aparecer exactamente una vez: ninguna falta y ninguna se repite.
- `sides.front[].rotation` y `sides.back[].rotation`: rotación de la página impresa en esa posición, en grados, `0` o `180`.

**Advertencia sobre los esquemas de ejemplo:** los esquemas incluidos en el repositorio son construidos a mano para demostrar la estructura del archivo, no esquemas tomados de una imprenta real.
El orden de páginas de cada firma (qué página va en cada hoja tras el plegado) fue verificado a mano y es correcto.
La convención de rotación por posición, en cambio, no ha sido confirmada contra una tabla de imposición estándar de la industria ni contra un pliego doblado físicamente.
Antes de usar estos esquemas para imprimir, hay que doblar un pliego de prueba con el esquema elegido y comprobar que cada página queda del lado y en la orientación correctos.

### `public/config/encuadernaciones.json`

Contiene los métodos de encuadernación disponibles: sus límites de páginas, su aporte al lomo y, cuando corresponde, su corrimiento por hoja.

```json
{
  "source": "Valores de ejemplo; reemplazar por datos reales de la imprenta.",
  "provisional": true,
  "bindings": [
    {
      "id": "grapa",
      "name": "Grapa (caballete)",
      "pageMultiple": 4,
      "minPages": 8,
      "maxPages": 64,
      "spineAllowance_mm": 0,
      "nests": true,
      "requiresSignatureMultiple": false
    }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de encuadernación, como "Fuente: `<source>` (config/encuadernaciones.json)".
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `bindings`: arreglo no vacío de métodos de encuadernación.
- `id`: identificador único del método, usado como referencia desde `formatos.json` (`defaults.bindingId`) y desde el store.
- `name`: nombre visible en el selector de encuadernación.
- `pageMultiple`: múltiplo de páginas que exige el método, entero positivo y par, porque un pliego siempre aporta dos páginas.
  El número de páginas del libro debe ser múltiplo de este valor para ese método.
- `minPages` y `maxPages`: límites de páginas que admite el método, enteros positivos y múltiplos de `pageMultiple`, con `minPages` menor o igual que `maxPages`.
  Los métodos hotmelt y PUR de ejemplo aceptan cualquier múltiplo de 2, pero los esquemas de plegado incluidos en el repositorio solo producen ciertos totales de página sin dejar páginas en blanco; no todo número de páginas aceptado por el método calza exactamente con una firma completa.
- `spineAllowance_mm`: aporte del método al lomo final, en milímetros, número finito no negativo, que se suma al lomo del papel interior.
  Los métodos que cosen o pegan el lomo (por ejemplo hotmelt, PUR o cosido a hilo) declaran un valor mayor que cero aquí.
- `nests`: booleano que indica si las hojas plegadas del método se anidan una dentro de otra, como ocurre en la grapa (caballete).
  Cuando es `true`, el motor calcula el corrimiento (creep o shingling) como un calibre de papel por cada hoja anidada entre esa hoja y el centro del cuadernillo, usando el calibre del gramaje seleccionado en el panel de sustrato; los métodos que apilan las firmas en vez de anidarlas, como los que pegan o cosen el lomo, declaran `false` aquí porque no tienen corrimiento que compensar.
  No hay un campo aparte para indicar si el método produce un lomo plano y cuadrado o solo un pliegue: se deriva de este mismo campo.
  Un método con `nests: true` produce un pliegue, no un lomo cuadrado, porque anida pliegos plegados uno dentro de otro; un método con `nests: false`, como hotmelt, PUR o cosido a hilo, produce un lomo plano y cuadrado.
  La tapa dura solo se ofrece como compatible con un método cuyo `nests` sea `false`.
- `requiresSignatureMultiple`: booleano que indica si el método, además del múltiplo de `pageMultiple`, exige que el número de páginas sea múltiplo del tamaño de la firma.
  Esta regla se aplica contra el esquema de plegado realmente seleccionado en cada momento, no contra un tamaño de firma fijo: si todavía no hay un esquema seleccionado, la regla simplemente no se evalúa.

### `public/config/tapas.json`

Contiene los tipos de tapa disponibles, blandos y duros, con las medidas que el motor de tapa necesita para calcular el pliego o el forro.

```json
{
  "source": "Valores de ejemplo; reemplazar por datos reales de la imprenta.",
  "provisional": true,
  "covers": [
    {
      "id": "blanda_simple",
      "name": "Tapa blanda sin solapas",
      "kind": "blanda",
      "substrateId": "couche_matte",
      "grammage": 300,
      "flapWidth_mm": 0,
      "squares_mm": 0,
      "hingeGap_mm": 0,
      "turnIn_mm": 0,
      "boardThickness_mm": 0
    }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de tapa, como "Fuente: `<source>` (config/tapas.json)".
- `provisional`: `true` o `false`.
  Dice si el archivo sigue trayendo los datos de ejemplo del repositorio o ya son los de la imprenta.
  Es obligatorio: un archivo que lo omitiera estaría afirmando, por no decir nada, que sus datos son reales.
  El distintivo de la cabecera cuenta exactamente estos seis campos, y desaparece cuando los seis son `false`.
- `covers`: arreglo no vacío de tipos de tapa.
- `id`: identificador único del tipo de tapa, usado como referencia desde `formatos.json` (`defaults.coverId`) y desde el store.
- `name`: nombre visible en el selector de tapa.
- `kind`: `"blanda"` o `"dura"`.
  Determina qué campos exige el resto de la entrada y si el tipo de tapa se ofrece para un método de encuadernación dado.
- `substrateId`: id de un sustrato existente en `sustratos.json`, para el material de la tapa (o del forro, en una tapa dura).
  La tapa no declara su propio papel: reutiliza el calibre y el peso ya definidos para ese sustrato.
- `grammage`: gramaje del material de tapa, en g/m², que debe existir entre las opciones del sustrato referenciado.
- `flapWidth_mm`: ancho de cada solapa, en milímetros.
  Una tapa blanda admite un valor mayor o igual que cero; una tapa dura, sin solapas en este modelo, exige exactamente 0.
- `squares_mm`: ceja, el saliente del cartón sobre las páginas en cabeza, pie y corte, en milímetros.
  Una tapa dura exige un valor mayor que cero; una tapa blanda, sin cartón, exige exactamente 0.
- `hingeGap_mm`: canal de bisagra, el hueco entre el cartón lateral y el cartón de lomo, en milímetros.
  Una tapa dura exige un valor mayor que cero; una tapa blanda exige exactamente 0.
- `turnIn_mm`: doblez de forro sobre el canto del cartón, en milímetros.
  Una tapa dura exige un valor mayor que cero; una tapa blanda exige exactamente 0.
- `boardThickness_mm`: grosor del cartón, en milímetros.
  Una tapa dura exige un valor mayor que cero; una tapa blanda, sin cartón, exige exactamente 0.

El motor de tapa dura ignora el sangrado del libro: el doblez de forro (`turnIn_mm`) cumple ese rol, envolviendo el canto del cartón en vez de dejar un margen de corte.
El motor no calcula el peso del cartón: el catálogo no declara una densidad de cartón, y estimar una produciría un número inventado; solo se calcula y muestra su área.

### `public/config/formatos.json`

Contiene las proporciones de página disponibles y los valores iniciales con los que arranca la calculadora.

```json
{
  "proportions": [
    { "label": "2:3", "ratio": [2, 3], "description": "Proporción clásica editorial" }
  ],
  "defaults": {
    "substrateId": "couche_matte",
    "grammage": 150,
    "sheetSizeId": "tabloide",
    "pageWidth_mm": 140,
    "proportionId": "2:3",
    "bleed_mm": 3,
    "totalPages": 32,
    "pressId": "prensa_70x100",
    "bindingId": "grapa",
    "coverId": "blanda_simple"
  }
}
```

- `proportions`: arreglo no vacío de proporciones de página disponibles.
  El orden importa: el Canvas Designer solo muestra botones para las tres primeras (`proportions[0]`, `[1]` y `[2]`); el resto queda en el archivo pero no tiene botón propio en la interfaz.
- `proportions[].label`: etiqueta única de la proporción, usada como referencia desde `defaults.proportionId` y desde el store.
- `proportions[].ratio`: arreglo de exactamente dos números `[ancho, alto]` que define la proporción, sin unidad (es una razón).
- `proportions[].description`: texto explicativo mostrado como `title` del botón de proporción.
- `defaults`: valores iniciales del libro al arrancar la aplicación.
- `defaults.substrateId`: id de un sustrato existente en `sustratos.json`.
- `defaults.grammage`: gramaje inicial, en g/m², que debe existir entre las opciones del sustrato referenciado.
- `defaults.sheetSizeId`: id de un pliego existente en `pliegos.json`.
- `defaults.pageWidth_mm`: ancho inicial de página cerrada, en milímetros.
  Este ancho se mantiene tal cual; el alto se deriva de él aplicando `defaults.proportionId`.
- `defaults.proportionId`: etiqueta de una de las tres primeras proporciones de `proportions`, usada para derivar el alto de página a partir del ancho.
  Debe estar entre las tres primeras porque es la única forma de que el usuario pueda volver a seleccionarla desde un botón del Canvas Designer.
- `defaults.bleed_mm`: sangrado inicial, en milímetros, no negativo.
- `defaults.totalPages`: número inicial de páginas del libro, entero positivo.
- `defaults.pressId`: id de una prensa existente en `maquinas.json`, usada para la imposición por firmas.
  No existe un esquema de plegado por defecto: la aplicación elige automáticamente, al arrancar, el esquema disponible que menos papel desperdicia para la prensa y el pliego iniciales.
- `defaults.bindingId`: id de un método de encuadernación existente en `encuadernaciones.json`, usado como método inicial en el selector de encuadernación.
- `defaults.coverId`: id de un tipo de tapa existente en `tapas.json`, usado como tipo inicial en el selector de tapa.

El formato (`vertical`, `apaisado`, `cuadrado`), el sistema de unidades y la orientación de rotación manual no vienen de `formatos.json`: quedan en sus valores por defecto del código (`vertical`, métrico, automática) porque no dependen de datos de imprenta.

## Reglas de validación

Antes de usar los siete archivos, la aplicación los valida con un validador propio, sin dependencias externas.
El validador recorre todo el contenido y acumula todos los errores encontrados, en vez de detenerse en el primero.
Cada error reportado incluye el archivo, la ruta del campo (por ejemplo `substrates[2].options[0].caliper`) y el motivo.

Reglas aplicadas:

- Los arreglos de sustratos, pliegos, prensas, esquemas de plegado, encuadernaciones, tapas, proporciones y opciones de gramaje no pueden estar vacíos.
- El campo `source` de `sustratos.json`, `pliegos.json`, `maquinas.json`, `esquemas.json`, `encuadernaciones.json` y `tapas.json` no puede estar vacío.
- Esos mismos seis archivos deben declarar `provisional` como `true` o `false`; omitirlo es un error, y un archivo que no se pueda leer cuenta como `true`.
- Los campos de texto libres (nombre, tipo, descripción) no pueden estar vacíos.
- Los identificadores y etiquetas (id de sustrato, id de pliego, id de prensa, id de esquema, id de encuadernación, id de tapa, etiqueta de proporción, y las referencias `defaults.substrateId`, `defaults.sheetSizeId`, `defaults.pressId`, `defaults.proportionId`, `defaults.bindingId`, `defaults.coverId`) no pueden estar vacíos ni tener espacios al inicio o al final.
- Los id de sustrato, los id de pliego, los id de prensa, los id de esquema, los id de encuadernación, los id de tapa y las etiquetas de proporción deben ser únicos dentro de su archivo; un id se considera visto para efectos de duplicado y de referencia en cuanto está bien formado, aunque otro campo de esa misma entrada sea inválido.
- El gramaje debe ser único dentro de cada sustrato, con la misma regla: un gramaje bien formado cuenta para detectar duplicados aunque su calibre sea inválido.
- Las dimensiones (`width_mm`, `height_mm`, `maxSheetWidth_mm`, `maxSheetHeight_mm`), el gramaje, el calibre, los componentes de `ratio` y `pageWidth_mm` deben ser números finitos mayores que cero.
- El sangrado (`bleed_mm`) debe ser un número finito mayor o igual que cero.
- Los márgenes de la prensa (`gripperMargin_mm`, `sideMargin_mm`, `tailMargin_mm`, `gutter_mm`) deben ser números finitos mayores o iguales que cero, y deben dejar área imprimible: `gripperMargin_mm + tailMargin_mm` debe ser menor que `maxSheetHeight_mm`, y el doble de `sideMargin_mm` debe ser menor que `maxSheetWidth_mm`.
- El número de páginas (`totalPages`) debe ser un entero seguro mayor que cero.
- `ratio` debe tener exactamente dos números.
- `pagesPerSignature` debe ser un entero seguro mayor que cero, múltiplo de 4 y como máximo 128.
- `cols` y `rows` deben ser enteros seguros mayores que cero, y su producto debe ser igual a la mitad de `pagesPerSignature`.
- `sides.front` y `sides.back` deben ser arreglos de exactamente `cols × rows` posiciones cada uno; cada posición debe tener un `page` entero y una `rotation` de `0` o `180`; solo se comprueba que las páginas cubran exactamente `1..pagesPerSignature` una vez que la cantidad de posiciones y cada posición individual ya son válidas, para no acumular un error de cobertura sobre un problema ya reportado.
- `pageMultiple`, `minPages` y `maxPages` deben ser enteros seguros mayores que cero; `pageMultiple` debe además ser par; `minPages` y `maxPages` deben ser múltiplos de `pageMultiple`, y `minPages` debe ser menor o igual que `maxPages`.
- `spineAllowance_mm` debe ser un número finito mayor o igual que cero, y `nests` debe ser un valor booleano.
- `requiresSignatureMultiple` debe ser un valor booleano.
- `kind` debe ser `"blanda"` o `"dura"`.
- `substrateId` de una tapa debe referenciar un id de sustrato existente en `sustratos.json`, y su `grammage` debe existir entre las opciones de ese sustrato.
- Todos los campos en milímetros de una tapa (`flapWidth_mm`, `squares_mm`, `hingeGap_mm`, `turnIn_mm`, `boardThickness_mm`) deben ser números finitos mayores o iguales que cero; además, una tapa `"blanda"` exige que `squares_mm`, `hingeGap_mm`, `turnIn_mm` y `boardThickness_mm` sean exactamente 0, y una tapa `"dura"` exige que esos mismos cuatro campos sean mayores que cero y que `flapWidth_mm` sea exactamente 0.
- `defaults.substrateId`, `defaults.sheetSizeId`, `defaults.pressId`, `defaults.proportionId`, `defaults.bindingId` y `defaults.coverId` deben referenciar un id o etiqueta existente en su catálogo correspondiente, y `defaults.grammage` debe existir entre las opciones del sustrato referenciado; una entrada inválida por otro motivo no hace que su id o gramaje, si están bien formados, se reporten como inexistentes.
- `defaults.proportionId` debe estar además entre las tres primeras proporciones de `proportions`, para que siempre haya un botón visible que la seleccione.

Si algún archivo falla al cargarse (fallo de red, tiempo de espera agotado, código distinto de 2xx, HTML en vez de JSON, o JSON inválido) o si la validación encuentra errores, la aplicación muestra un bloque con `role="alert"` que lista cada problema, en vez de quedar en blanco o mostrar datos parciales.

## Editar la configuración después de compilar

Los siete archivos se copian tal cual a `dist/config/` al ejecutar `npm run build`, porque viven en `public/`.
Para cambiar un dato (por ejemplo, el calibre de un sustrato) sin recompilar, basta con editar el archivo correspondiente dentro de `dist/config/` y recargar el navegador: la aplicación vuelve a leerlo en cada carga de página, no lo empaqueta en el JavaScript compilado.
Esto es lo que permite, en `npm run preview`, cambiar `dist/config/sustratos.json` y ver el lomo recalculado sin volver a construir la aplicación.
