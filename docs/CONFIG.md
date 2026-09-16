# Configuración en runtime

## Propósito

PliegoStack carga su catálogo de sustratos, pliegos, proporciones y valores por defecto desde archivos JSON en `public/config/` en vez de compilarlos en el código.
Esto permite reemplazar los datos de una imprenta real, sin recompilar la aplicación, editando esos archivos y recargando el navegador.
Los valores incluidos en el repositorio son de ejemplo.
Deben reemplazarse por datos reales de una imprenta antes de usar la herramienta en producción.

## Archivos

La aplicación carga los cinco archivos en paralelo al iniciar, usando `import.meta.env.BASE_URL` como prefijo para que funcione también en despliegues bajo una subruta.
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
  "sheetSizes": [
    { "id": "tabloide", "name": "Doble Carta (Tabloid)", "width_mm": 432, "height_mm": 279 }
  ]
}
```

- `source`: texto no vacío que describe el origen de estos datos.
  La aplicación lo muestra tal cual, junto al selector de pliego, como "Fuente: `<source>` (config/pliegos.json)".
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
  "source": "Esquemas de plegado construidos a mano como ejemplo; deben confirmarse contra un pliego doblado real antes de usarse en producción.",
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
    "pressId": "prensa_70x100"
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

El formato (`vertical`, `apaisado`, `cuadrado`), el sistema de unidades y la orientación de rotación manual no vienen de `formatos.json`: quedan en sus valores por defecto del código (`vertical`, métrico, automática) porque no dependen de datos de imprenta.

## Reglas de validación

Antes de usar los cinco archivos, la aplicación los valida con un validador propio, sin dependencias externas.
El validador recorre todo el contenido y acumula todos los errores encontrados, en vez de detenerse en el primero.
Cada error reportado incluye el archivo, la ruta del campo (por ejemplo `substrates[2].options[0].caliper`) y el motivo.

Reglas aplicadas:

- Los arreglos de sustratos, pliegos, prensas, esquemas de plegado, proporciones y opciones de gramaje no pueden estar vacíos.
- El campo `source` de `sustratos.json`, `pliegos.json`, `maquinas.json` y `esquemas.json` no puede estar vacío.
- Los campos de texto libres (nombre, tipo, descripción) no pueden estar vacíos.
- Los identificadores y etiquetas (id de sustrato, id de pliego, id de prensa, id de esquema, etiqueta de proporción, y las referencias `defaults.substrateId`, `defaults.sheetSizeId`, `defaults.pressId`, `defaults.proportionId`) no pueden estar vacíos ni tener espacios al inicio o al final.
- Los id de sustrato, los id de pliego, los id de prensa, los id de esquema y las etiquetas de proporción deben ser únicos dentro de su archivo; un id se considera visto para efectos de duplicado y de referencia en cuanto está bien formado, aunque otro campo de esa misma entrada sea inválido.
- El gramaje debe ser único dentro de cada sustrato, con la misma regla: un gramaje bien formado cuenta para detectar duplicados aunque su calibre sea inválido.
- Las dimensiones (`width_mm`, `height_mm`, `maxSheetWidth_mm`, `maxSheetHeight_mm`), el gramaje, el calibre, los componentes de `ratio` y `pageWidth_mm` deben ser números finitos mayores que cero.
- El sangrado (`bleed_mm`) debe ser un número finito mayor o igual que cero.
- Los márgenes de la prensa (`gripperMargin_mm`, `sideMargin_mm`, `tailMargin_mm`, `gutter_mm`) deben ser números finitos mayores o iguales que cero, y deben dejar área imprimible: `gripperMargin_mm + tailMargin_mm` debe ser menor que `maxSheetHeight_mm`, y el doble de `sideMargin_mm` debe ser menor que `maxSheetWidth_mm`.
- El número de páginas (`totalPages`) debe ser un entero seguro mayor que cero.
- `ratio` debe tener exactamente dos números.
- `pagesPerSignature` debe ser un entero seguro mayor que cero, múltiplo de 4 y como máximo 128.
- `cols` y `rows` deben ser enteros seguros mayores que cero, y su producto debe ser igual a la mitad de `pagesPerSignature`.
- `sides.front` y `sides.back` deben ser arreglos de exactamente `cols × rows` posiciones cada uno; cada posición debe tener un `page` entero y una `rotation` de `0` o `180`; solo se comprueba que las páginas cubran exactamente `1..pagesPerSignature` una vez que la cantidad de posiciones y cada posición individual ya son válidas, para no acumular un error de cobertura sobre un problema ya reportado.
- `defaults.substrateId`, `defaults.sheetSizeId`, `defaults.pressId` y `defaults.proportionId` deben referenciar un id o etiqueta existente en su catálogo correspondiente, y `defaults.grammage` debe existir entre las opciones del sustrato referenciado; una entrada inválida por otro motivo no hace que su id o gramaje, si están bien formados, se reporten como inexistentes.
- `defaults.proportionId` debe estar además entre las tres primeras proporciones de `proportions`, para que siempre haya un botón visible que la seleccione.

Si algún archivo falla al cargarse (fallo de red, tiempo de espera agotado, código distinto de 2xx, HTML en vez de JSON, o JSON inválido) o si la validación encuentra errores, la aplicación muestra un bloque con `role="alert"` que lista cada problema, en vez de quedar en blanco o mostrar datos parciales.

## Editar la configuración después de compilar

Los tres archivos se copian tal cual a `dist/config/` al ejecutar `npm run build`, porque viven en `public/`.
Para cambiar un dato (por ejemplo, el calibre de un sustrato) sin recompilar, basta con editar el archivo correspondiente dentro de `dist/config/` y recargar el navegador: la aplicación vuelve a leerlo en cada carga de página, no lo empaqueta en el JavaScript compilado.
Esto es lo que permite, en `npm run preview`, cambiar `dist/config/sustratos.json` y ver el lomo recalculado sin volver a construir la aplicación.
