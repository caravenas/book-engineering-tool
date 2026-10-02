# Estado: el store y la capa de usuario

El estado vive en un store de Zustand, `src/store/useBookStore.ts`.
`createBookStore(storage)` lo construye con el almacenamiento que se le inyecta, para que las pruebas puedan darle uno que falle sin tocar el del navegador, y `useBookStore` es la instancia que usa la aplicación.

## Qué guarda

- **El catálogo cargado** (`catalog`), tal como lo validó `validateCatalog`: sustratos, pliegos, prensas, esquemas de plegado, encuadernaciones, tapas, proporciones y los valores por defecto.
  No cambia mientras la página está abierta.
- **La capa de usuario**, en seis catálogos: lo que el usuario añadió, lo que parchó de la fábrica y lo que ocultó.
- **Las entradas del libro**: formato, proporción activa, ancho y alto de página, sangrado, sistema de unidades, orientación de la página sobre el pliego, papel y gramaje, pliego, prensa, esquema de plegado (`foldingSchemeId`), total de páginas, encuadernación y tapa.
- **Los resultados calculados**, cada uno con su error: la imposición geométrica, el plan de firmas, el lomo y el peso, la validación del número de páginas, el lomo con encuadernación, el corrimiento y el plan de tapa.
- **Banderas de persistencia**: si el almacenamiento está disponible, si una escritura falló, y la lista de entradas huérfanas.

`foldingSchemeId` en `null` significa «automático»: se usa el esquema que menos papel desperdicia.
Si el usuario fija uno que ya no cabe, el plan conserva el último elegido y el error lo dice.

El total de páginas se guarda dos veces: `totalPagesInput`, el texto tal como se tecleó, y `totalPages`, el entero que se calcula.
Un texto que no es un entero positivo seguro deja `totalPages` en 0, y los motores lo rechazan en lugar de calcular con un valor inventado.

## Cómo se recalcula

Toda acción que cambia una entrada que influye en un cálculo pasa por `withUpdatedCalculations`, que aplica el cambio y recalcula todo en la misma actualización: nunca queda un resultado calculado sobre una entrada anterior.
El sistema de unidades, que solo cambia lo que se muestra, no recalcula.
`calculateResults` llama a los motores en el orden descrito en `engines.md`.

Cada resultado se calcula dentro de su propio `try/catch`.
Un error de un motor deja `null` en ese resultado y un texto en su campo de error (`impositionError`, `signatureError`, `spineError`, `bindingError`, `coverError`), y los demás resultados se siguen calculando.
Una excepción de un paso que ya explica otro, como el corrimiento cuando el número de páginas no es múltiplo de 4, se absorbe como «nada que mostrar» y no como un error duplicado.

Los componentes comparten tres funciones puras del store para no repetir una decisión: `getSafeSpineResult` (si el lomo calculado es seguro de mostrar), `getPlannedCover` (el plan de tapa exitoso, sin el rechazo) y `getSelectedBindingInfo` (la encuadernación elegida y si tiene lomo plano).

## La capa de usuario

El modelo es una superposición sobre los datos de fábrica, no una copia.
Por cada catálogo que tiene identidad propia (proporciones, papeles, tapas, pliegos, prensas y encuadernaciones) la capa guarda solo tres cosas:

- **Altas** (`customX`): entradas nuevas, con un id generado de la forma `custom_<tipo>_<n>_<marca de tiempo>`.
  Las proporciones no tienen id: se identifican por su etiqueta.
  Los gramajes propios (`customGrammages`) son una lista aparte, porque cuelgan de un papel y no tienen identidad propia.
- **Parches** (`xPatches`): solo los campos que el usuario cambió de una entrada de fábrica, identificados por su id (por su etiqueta, en las proporciones).
- **Ocultamientos** (`hiddenXIds`): el id de una entrada de fábrica que el usuario no quiere ver.

El catálogo efectivo (`getAllSubstrates`, `getAllPresses` y los demás `getAll*`) se calcula siempre como fábrica más capa, y nunca se guarda fusionado.
El orden efectivo es: quitar lo oculto, aplicar los parches a lo que queda, y añadir las altas.
Por eso una alta no se puede parchar ni ocultar, y un ocultamiento gana a un parche sobre la misma entrada.
Como el parche guarda solo los campos tocados, una entrada parchada hereda los campos nuevos que traiga una actualización de los datos de fábrica.

Los esquemas de plegado no tienen capa de usuario: son solo lectura.

### Acciones

Por cada catálogo hay una familia de acciones del store con el mismo patrón:

| Acción | Qué hace |
|---|---|
| `addCustomX` | Da de alta una entrada propia y devuelve si lo logró; si no, deja el motivo en `customXError`. |
| `editCustomX` | Cambia una entrada propia, fusionando los campos tocados con los que ya tenía; rechaza un cambio que la dejaría inválida. |
| `removeCustomX` | Elimina una entrada propia. |
| `patchX` / `unpatchX` | Parcha una entrada de fábrica, o vuelve a la de fábrica. |
| `hideX` / `showX` | Oculta una entrada de fábrica, o la vuelve a mostrar. |
| `clearCustomXError` | Limpia el error de la última alta. |

Si la acción afecta a la selección vigente (por ejemplo, ocultar la prensa elegida), la selección cae a la primera entrada visible, que es el criterio menos destructivo.
Un valor por defecto que el usuario ocultó no vuelve a quedar seleccionado al recargar: `initialize` resuelve cada selección contra el catálogo efectivo.

### Persistencia

- Se guarda en el almacenamiento local del navegador, bajo la clave `pliegostack:userLayer`, como JSON con un campo `version` (hoy 2).
- `readUserLayer` nunca lanza: un valor ausente, corrupto, manipulado o de una versión no reconocida se trata como «no hay nada guardado».
  Una entrada mal formada dentro de una lista válida se descarta sola, y las demás sobreviven.
  Una carga de versión 1 se migra dejando intactas sus altas y empezando vacíos los parches y ocultamientos.
- `writeUserLayer` nunca lanza: devuelve si se guardó.
  Si no se pudo, el cambio se queda en memoria durante la sesión y la interfaz avisa que se perderá al recargar.
- **Se persisten los catálogos personalizados, no la selección actual**: tras recargar, una prensa propia sigue en el desplegable pero no queda elegida.
- Al arrancar se comprueba una sola vez si el almacenamiento está disponible; si no lo está, la aplicación funciona completa con los datos de fábrica.

### Huérfanos

Si una actualización de los datos de fábrica elimina el id al que apunta un parche o un ocultamiento, ese registro queda huérfano.
`computeOrphanedUserLayerEntries` los detecta en cada carga y tras cada escritura.
Un huérfano no se aplica, pero tampoco se borra del almacenamiento, así que el trabajo sobrevive si el id vuelve en una actualización posterior.
La interfaz lo avisa al cargar, y permite descartar el aviso o eliminar cada huérfano.

## Cómo se comprueba

- `src/__tests__/store.test.ts` cubre las acciones y los cálculos del store, con almacenamientos inyectados.
- `src/__tests__/userLayer.test.ts`, `userLayerPatches.test.ts` y `persistence.test.ts` cubren la lectura, la escritura y la migración.
- `src/__tests__/goldenConfig.test.ts` carga los JSON entregados en `public/config/` y fija los resultados de la configuración por defecto.
