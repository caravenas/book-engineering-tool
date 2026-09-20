# Rediseño de la interfaz — PliegoStack

Redactado el 2026-09-19 a partir de `docs/UI-INVENTORY.md` y de las cinco capturas que lo acompañan.
Este documento manda sobre `docs/UX-REVIEW.md` allí donde difieran, incluido el encabezado de esa revisión que declara congelados los tokens visuales.
Los incrementos que lo llevan a código están en `docs/PLAN.md`.
Los bocetos están en un canvas privado: https://claude.ai/artifact/KheoGdDavgBXbAq6qovUc7, con cuatro mesas: espacio de trabajo a 1440, catálogo unificado a 1440, móvil a 390 y una hoja de estados.

## Idea central

Hoy PliegoStack se lee como un documento: seis paneles apilados, 3477 px de alto a 1440 px, y los resultados repartidos entre los controles que los producen.
La propuesta lo convierte en una herramienta de una sola pantalla, en la que se ve a la vez qué se pide, qué forma tiene y qué resulta.

- **Izquierda, ficha técnica (400 px)**: los cinco pasos numerados (Formato, Papel interior, Páginas y encuadernación, Imposición, Tapa) en un acordeón.
  Cada paso cerrado muestra su resumen en monoespaciada, por ejemplo `140 × 210 · 2:3`, así que la ficha entera se lee sin abrir nada.
- **Centro, vista previa**: un solo diagrama grande con un selector Página · Pliego · Tapa.
  Los tres diagramas actuales dejan de competir por espacio dentro de sus paneles.
- **Derecha, resultados (320 px)**: todas las cifras en un solo lugar, con el lomo como cifra principal.
  Las fórmulas pasan a una sección desplegable, «Cómo se calcula».

A 1440 px la página deja de desplazarse: solo se desplazan la ficha y los resultados, cada uno dentro de su columna.

## Estilo

Se conserva el tono editorial del sitio: fondo papel `#F9F9F7`, tinta `#0F172A`, filetes `#E1E4E8`, Outfit para títulos y cifras, Inter para texto y JetBrains Mono para medidas y rutas.
También se conservan las etiquetas en versalitas espaciadas y los campos en cápsula con borde de tinta, que son la firma visual actual.
La cápsula se extiende a todo control de entrada: campos numéricos, desplegables, segmentos, fichas de gramaje y botones de opciones.

Lo que cambia respecto del sitio actual:

- El acento `#12A9D8` se reserva para rellenar los diagramas; los textos y enlaces usan `#0A6285`, porque el cian sobre papel no llega a 4.5:1 de contraste.
- El segmento activo pasa a ser una cápsula rellena de tinta dentro del contorno, igual en formato, proporción, vista y cara mostrada.
- Las tarjetas con borde de las estadísticas se sustituyen por pares de etiqueta y cifra separados por filetes.
- Todo control mide al menos 40 px de alto en escritorio y 44 px en móvil.

## Dónde queda cada función

Ninguna función desaparece: cada una cambia de sitio.

| Hoy | En la propuesta |
| --- | --- |
| Formato: segmentos de formato y proporción, ancho, alto y sangrado | Paso 01 de la ficha; los tres campos en una sola fila |
| Editar, «+ Person.» y ocultar proporción | Botón de opciones (`···`) junto al segmento, que lleva al Catálogo |
| Sustrato: desplegable de papel, gramajes y añadir gramaje | Paso 02; gramajes como fichas con «+» al final |
| Calibre declarado (tarjeta grande) | Línea bajo los gramajes: `g/m² · calibre declarado 120 µm` |
| Número de páginas | Paso 03 |
| Encuadernación: desplegable, editar, añadir, ocultar | Paso 03, con el mismo botón de opciones; la regla de páginas del método se muestra debajo |
| Nota de corrimiento (el texto más largo) | Cifra «Corrimiento máx.» en Resultados; la explicación completa, en «Cómo se calcula» |
| Prensa y pliego con editar, añadir, ocultar | Paso 04, con el botón de opciones |
| Esquema de plegado | Paso 04 |
| Cara mostrada (tiro o retiro) | Conmutador sobre la vista previa, solo en la vista Pliego, porque cambia lo que se ve y no el cálculo |
| Tipo de tapa | Paso 05 |
| Desglose de tapa (solapas, contratapa, lomo, portada) | Rotulado dentro del diagrama de Tapa |
| Diagramas de página, pliego y tapa | Vista previa central con selector |
| Las 16 tarjetas de estadística | Columna de Resultados |
| Ruta `config/*.json` y «Valores de ejemplo» en cada panel | Un único distintivo «Datos de ejemplo» en la cabecera, una nota al pie de la ficha y la ruta dentro de cada catálogo |
| Distintivo de origen «de fábrica», «editado», «tuyo» | Etiqueta junto a la etiqueta del campo, y columna de origen en el Catálogo |

## Catálogo unificado

Añadir, editar, ocultar y restaurar dejan de estar sembrados por los paneles como enlaces de 11 px y pasan a un panel lateral, el Catálogo, que se abre desde la cabecera o desde cualquier botón de opciones.

- Navegación por catálogo, agrupada en Formato, Papel y Producción, con el número de entradas.
- Lista de entradas con medidas y origen, formulario de edición con los campos reales del JSON (en prensas: pliego máximo, pinza, lateral, cola y calle) y acciones «Volver a fábrica», «Ocultar», «Cancelar» y «Guardar cambios».
- Una sección «Ocultas» para restaurar.
- El estado de persistencia («Guardado en este navegador» o «Solo para esta sesión») vive en la cabecera del panel, no en un aviso suelto.

Esto no resuelve la asimetría de editabilidad, pero deja de esconderla: papeles, esquemas de plegado y tapas llevan un candado y una línea que explica que por ahora solo se leen desde `public/config/`.
Cuando esos catálogos ganen edición, el candado se quita y la pantalla no cambia.

## Móvil (390 px)

- Barra de resultados fija arriba con tres cifras: lomo, pliegos de prensa y peso interior.
- Vista previa con el mismo selector de tres vistas.
- Los cinco pasos en acordeón y, debajo, el resto de los resultados.
- Todos los contenedores usan `minmax(0, 1fr)` y ancho relativo, lo que elimina el desbordamiento de 7 px de `app-cell`.

A 1024 px, que el canvas no dibuja, la propuesta es mantener la ficha a la izquierda y pasar los Resultados debajo de la vista previa.

## Estados

El canvas incluye una hoja con los siete estados del inventario, siguiendo su texto.
Dos añaden comportamiento:

- **Imposición sin solución** ofrece «Cambiar pliego» y «Cambiar prensa», que llevan al paso 04.
- **Entrada inválida** dice qué regla falla, por ejemplo el múltiplo y el rango de páginas del método, en vez de un mensaje genérico.

## Huecos cerrados tras contrastar el canvas con el inventario

Cuatro funciones del inventario no tenían sitio en los bocetos.
Ninguna es un cambio de rumbo; son decisiones que faltaban.

1. **Eliminar una entrada propia.**
   El formulario del Catálogo ofrece «Volver a fábrica» y «Ocultar», y ninguna de las dos se aplica a una entrada tuya: no tiene fábrica a la que volver ni tiene sentido ocultarla.
   La regla es que el par de acciones depende del origen: una entrada de fábrica ofrece «Volver a fábrica» y «Ocultar», y una entrada tuya ofrece «Eliminar» en su lugar.
2. **Los gramajes dejan de ser un catálogo hermano.**
   El canvas los dibuja al lado de «Papeles» y sin candado, lo que promete una edición que no existe y esconde que un gramaje cuelga de un papel y no tiene identidad propia.
   Pasan a ser una lista dentro de «Papeles»: eliges un papel y ves sus gramajes.
   Llevan su propia nota, porque su nivel no es ninguno de los otros dos: puedes añadir los tuyos y eliminarlos, pero no editar ni ocultar los de fábrica.
3. **Eliminar un gramaje propio** vive en la ficha de cada gramaje añadido, dentro del paso 02, y cumple los 40 px de escritorio y 44 de móvil.
   Eso cierra además el punto abierto 2 del inventario, que era el solape de 12 px del área táctil de ese mismo botón contra su vecino.
4. **Exportar e importar no tienen sitio en esta propuesta**, y se deja dicho para que no se pierda: cuando UX-8 se retome, su lugar es la cabecera del Catálogo, junto al indicador de persistencia.

El aviso de registros huérfanos sí está dibujado, en la hoja de estados.
En el espacio de trabajo conserva el sitio que tiene hoy: un aviso descartable sobre la ficha.

## Contraste, ya medido

El punto 2 de la verificación de más abajo está resuelto, calculado sobre los tokens reales y sin navegador.
Sobre el fondo de papel `#F9F9F7`: `#12A9D8` da **2.59:1**, que no alcanza ni el 3:1 que se le permite al texto grande; `#0A6285` da **6.43:1** y `#5B6B82` da **5.15:1**.
Reservar el cian para los rellenos de los diagramas y llevar el texto a `#0A6285` es, por tanto, correcto.

Hoy esto no es un defecto vivo: `.stat-value.amber`, `.stat-value.emerald` y `.stat-value.sky` pintarían con esos colores, pero los diecinueve sitios que usan `stat-value` sobrescriben el color en línea con `--color-text-primary`.
Son reglas muertas, y el rediseño es la ocasión de borrarlas.

## Un detalle de accesibilidad que conviene arreglar de paso

La etiqueta del campo de páginas está escrita en mayúsculas en el propio JSX, «NÚMERO DE PÁGINAS», no con `text-transform` en CSS.
Eso no es solo estilo: el nombre accesible que anuncia un lector de pantalla va en mayúsculas, y algunos lo deletrean letra a letra.
La propuesta ya lo resuelve sin proponérselo, porque sus etiquetas usan una clase con `text-transform: uppercase`, que deja el texto real en minúsculas.
Conviene hacerlo explícito al construir, y revisar si hay más etiquetas así.

## Decisiones abiertas

1. ~~Si «Cara mostrada» debe seguir en la ficha, porque hoy forma parte del estado del store, o puede pasar a ser un estado de la vista.~~
   **Cerrada el 2026-09-19: la premisa era falsa.**
   «Cara mostrada» nunca estuvo en el store; es un `useState` local de `ImpositionVisualizer.tsx`, línea 168, y el store no conoce ese concepto.
   Subirla a un conmutador sobre la vista previa no cuesta nada ni cambia ningún cálculo.
2. Si la selección actual debe persistirse (punto abierto 1): con una ficha visible, perderla al recargar se notará más.
3. Que el acordeón deje un solo paso abierto a la vez es una hipótesis; hay que probar si alguien necesita comparar dos pasos.
4. La vista a 1024 px está descrita, no dibujada.

## Cómo verificarla antes de construir

- Recorrer el canvas marcando en la tabla de arriba cada control del inventario, para confirmar que no se pierde ninguno.
- Medir en el navegador el contraste de `#5B6B82` y `#0A6285` sobre `#F9F9F7` y `#FCFCFC`.
- Construir primero solo la estructura de tres columnas sobre los componentes actuales, sin tocar tokens, y comprobar con `npm run preview` que a 1440 px no hay desplazamiento de página y a 390 px no hay desplazamiento horizontal.
