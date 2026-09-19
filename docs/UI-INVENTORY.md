# Inventario de la interfaz — PliegoStack

Levantado el 2026-09-19 sobre el commit `cfaefd0` de `master`, con la app compilada y servida con `npm run preview`.
Los controles y las etiquetas no están leídos del código sino extraídos del DOM renderizado, y las medidas están tomadas en un navegador real a anchos de viewport concretos.
Este documento existe para que una revisión de diseño parta de lo que la app es hoy, y no de una descripción de lo que debería ser.

## Cómo leer esto

Las capturas acompañan a este documento fuera del repositorio, por ser binarias.
Están agrupadas por ancho de viewport y numeradas por orden de desplazamiento.

Todo lo que sigue describe el estado por defecto: catálogo de fábrica, sin entradas propias y sin capa de usuario guardada.
Los estados de error, de entrada editada, de entrada propia y de aviso están descritos en prosa más abajo, no capturados.

## Medidas por ancho de viewport

| Ancho | Disposición | Alto total de la página | Scroll horizontal |
| --- | --- | --- | --- |
| 1440 px | Dos bandas de dos columnas más dos paneles de ancho completo | 3477 px | No |
| 1024 px | Una sola columna | 5548 px | No |
| 390 px | Una sola columna | 6040 px | **Sí, 7 px** |

El único punto de quiebre está en 1024 px, y a partir de él la página se vuelve un 60 % más alta.

El desbordamiento horizontal a 390 px lo producen los elementos con clase `app-cell`, que miden 397 px dentro de un viewport de 390.
Es un defecto, no una decisión: ningún contenido lo justifica.

## Altura de cada panel a 1440 px

| Panel | Alto | Controles | Tarjetas de estadística |
| --- | --- | --- | --- |
| Formato de página | 603 px | 13 | 0 |
| Sustrato (Papel) | 424 px | 7 | 0 |
| Lomo y peso del interior | 461 px | 1 | 4 |
| Encuadernación | 482 px | 4 | 3 |
| Imposición por firmas | 1126 px | 10 | 6 |
| Tapa | 895 px | 1 | 3 |

Imposición por firmas mide más que el viewport él solo, y entre él y Tapa suman el 58 % de la altura de la página.

## Inventario de controles

Las etiquetas son las que expone el DOM a un lector de pantalla, no las visibles cuando difieren.

### Formato de página

Tres botones de segmento de formato (Vertical, Apaisado, Cuadrado); cuatro de proporción (1:1, 2:3, 3:5 áurea, Manual); editar proporción de fábrica; añadir proporción personalizada; ocultar proporción de fábrica; y tres campos numéricos: ancho cerrado, alto cerrado y sangrado.
Distintivo de origen visible.

### Sustrato (Papel)

Un desplegable de tipo de papel con 7 opciones; cinco botones de segmento de gramaje; y añadir gramaje personalizado.
**No tiene editar ni ocultar**: los gramajes quedaron fuera del modelo de parches.

### Lomo y peso del interior

Un único campo, número de páginas.
Cuatro tarjetas: lomo estimado, peso del papel interior, hojas de papel interior y gramaje.
Es el único panel sin ningún control de catálogo.

### Encuadernación

Editar encuadernación de fábrica; añadir encuadernación personalizada; desplegable con 4 opciones; ocultar encuadernación de fábrica.
Tres tarjetas y dos notas explicativas, una de ellas el texto de corrimiento, que es el más largo de la interfaz.

### Imposición por firmas

Diez controles, los de dos catálogos a la vez: prensa (editar, añadir, desplegable de 2, ocultar), esquema de plegado (desplegable de 3), cara mostrada (desplegable de 2) y pliego (editar, añadir, desplegable de 6, ocultar).
Seis tarjetas y un diagrama del pliego.
Es el panel con más densidad de control de la app.

### Tapa

Un solo control: el desplegable de tipo de tapa, con 2 opciones.
**No tiene añadir, editar ni ocultar**: las tapas quedaron fuera del modelo de personalización.

## Asimetría de editabilidad

Es el hallazgo más visible del inventario, y es el mismo que la §1.4 de `docs/UX-REVIEW.md` diagnosticó antes de empezar.
Se redujo, pero no desapareció, y ahora tiene tres niveles en vez de dos:

- **Completo** (añadir, editar, ocultar, restaurar): proporciones, pliegos, prensas y encuadernaciones.
- **Parcial** (solo añadir y eliminar lo propio): gramajes.
- **Ninguno**: tapas, esquemas de plegado y sustratos.

Un usuario no tiene forma de saber por qué puede editar una prensa y no una tapa.
La razón es de implementación, no de producto: los gramajes son opciones anidadas sin identidad propia, y tapas y esquemas nunca recibieron superficie de edición.

## Estados no capturados

- **Carga**: un único indicador con rol de estado mientras se leen los siete archivos de configuración.
- **Error de configuración**: bloque con rol de alerta que lista archivo, ruta del campo y motivo por cada error, y no deja montar la app.
- **Entrada inválida**: mensaje explícito por panel; el cálculo dependiente no se muestra en vez de mostrarse mal.
- **Vacío de imposición**: cuando ningún esquema de plegado cabe en el pliego con la prensa elegida, el panel explica eso en vez de mostrar cifras.
- **Entrada propia o editada**: la nota de origen se sustituye por una palabra, «tuyo» o «editado», y aparece el control de eliminar o de volver a fábrica.
- **Sin almacenamiento**: aviso descartable con rol de estado, y las altas siguen funcionando calificadas como guardadas solo para esta sesión.
- **Huérfanos**: aviso descartable que nombra cada registro afectado y ofrece eliminarlo.

## Tokens visuales

Definidos en `:root` de `src/styles/index.css`.
La revisión de UX vigente los declara congelados: su encabezado dice que no es un restyle.

- **Color**: fondos `#FCFCFC` y `#F9F9F7`; borde `#E1E4E8`; acento `#12A9D8`, con `#0E83AF` y `#0A6285` como variantes; texto `#0F172A`, `#475569` y `#5B6B82`; peligro `#be123c`.
  Hay tokens heredados sin uso real, como los de esmeralda, cielo y ámbar, que conservan nombres de una paleta anterior.
- **Tipografía**: Inter para texto, Outfit para títulos, JetBrains Mono para datos y rutas de archivo. Escala de `0.75rem` a `2.25rem`.
- **Espaciado**: escala de `0.25rem` a `4rem`.
- **Radios**: 6, 10, 14 y 20 px. Los campos de texto usan cápsula completa.
- **Sombras**: prácticamente desactivadas; solo `--shadow-lg` tiene valor.
- **Foco**: anillo de 2 px con el color de acento y 2 px de separación, sobre `:focus-visible`.

## Puntos abiertos

Registrados en `docs/PLAN.md` y relevantes para cualquier decisión de diseño:

1. La selección actual no se persiste, solo el catálogo: tras recargar, una prensa propia sigue existiendo pero no queda elegida.
2. El área táctil del botón de eliminar gramaje se extiende 12 px hacia su vecino, el botón de añadir, y no está medido si lo invade.
3. El aviso de huérfanos ofrece eliminar pero no exportar, porque exportar no existe todavía.
4. La coletilla «guardado solo para esta sesión» no reacciona a un fallo de escritura ocurrido a mitad de sesión.
5. Una vez descartado, el aviso de persistencia no vuelve aunque ocurra un fallo nuevo.

## Propuesta de rediseño

Redactada el 2026-09-19 a partir de este inventario y de las cinco capturas.
Los bocetos están en un canvas privado: https://claude.ai/artifact/KheoGdDavgBXbAq6qovUc7.
Es un rediseño deliberado: contradice a propósito el encabezado de `docs/UX-REVIEW.md` («No es un restyle»), y cuando las dos difieran manda esta propuesta.

### Idea central

Hoy PliegoStack se lee como un documento: seis paneles apilados, 3477 px de alto a 1440 px, y los resultados repartidos entre los controles que los producen.
La propuesta lo convierte en una herramienta de una sola pantalla, en la que se ve a la vez qué se pide, qué forma tiene y qué resulta.

- **Izquierda, ficha técnica (400 px)**: los cinco pasos numerados (Formato, Papel interior, Páginas y encuadernación, Imposición, Tapa) en un acordeón.
  Cada paso cerrado muestra su resumen en monoespaciada, por ejemplo `140 × 210 · 2:3`, así que la ficha entera se lee sin abrir nada.
- **Centro, vista previa**: un solo diagrama grande con un selector Página · Pliego · Tapa.
  Los tres diagramas actuales dejan de competir por espacio dentro de sus paneles.
- **Derecha, resultados (320 px)**: todas las cifras en un solo lugar, con el lomo como cifra principal.
  Las fórmulas pasan a una sección desplegable, «Cómo se calcula».

A 1440 px la página deja de desplazarse: solo se desplazan la ficha y los resultados, cada uno dentro de su columna.

### Estilo

Se conserva el tono editorial del sitio: fondo papel `#F9F9F7`, tinta `#0F172A`, filetes `#E1E4E8`, Outfit para títulos y cifras, Inter para texto y JetBrains Mono para medidas y rutas.
También se conservan las etiquetas en versalitas espaciadas y los campos en cápsula con borde de tinta, que son la firma visual actual.
La cápsula se extiende a todo control de entrada: campos numéricos, desplegables, segmentos, fichas de gramaje y botones de opciones.

Lo que cambia respecto del sitio actual:

- El acento `#12A9D8` se reserva para rellenar los diagramas; los textos y enlaces usan `#0A6285`, porque el cian sobre papel no llega a 4.5:1 de contraste.
- El segmento activo pasa a ser una cápsula rellena de tinta dentro del contorno, igual en formato, proporción, vista y cara mostrada.
- Las tarjetas con borde de las estadísticas se sustituyen por pares de etiqueta y cifra separados por filetes.
- Todo control mide al menos 40 px de alto en escritorio y 44 px en móvil.

### Dónde queda cada función

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

### Catálogo unificado

Añadir, editar, ocultar y restaurar dejan de estar sembrados por los paneles como enlaces de 11 px y pasan a un panel lateral, el Catálogo, que se abre desde la cabecera o desde cualquier botón de opciones.

- Navegación por catálogo, agrupada en Formato, Papel y Producción, con el número de entradas.
- Lista de entradas con medidas y origen, formulario de edición con los campos reales del JSON (en prensas: pliego máximo, pinza, lateral, cola y calle) y acciones «Volver a fábrica», «Ocultar», «Cancelar» y «Guardar cambios».
- Una sección «Ocultas» para restaurar.
- El estado de persistencia («Guardado en este navegador» o «Solo para esta sesión») vive en la cabecera del panel, no en un aviso suelto.

Esto no resuelve la asimetría de editabilidad, pero deja de esconderla: papeles, esquemas de plegado y tapas llevan un candado y una línea que explica que por ahora solo se leen desde `public/config/`.
Cuando esos catálogos ganen edición, el candado se quita y la pantalla no cambia.

### Móvil (390 px)

- Barra de resultados fija arriba con tres cifras: lomo, pliegos de prensa y peso interior.
- Vista previa con el mismo selector de tres vistas.
- Los cinco pasos en acordeón y, debajo, el resto de los resultados.
- Todos los contenedores usan `minmax(0, 1fr)` y ancho relativo, lo que elimina el desbordamiento de 7 px de `app-cell`.

A 1024 px, que el canvas no dibuja, la propuesta es mantener la ficha a la izquierda y pasar los Resultados debajo de la vista previa.

### Estados

El canvas incluye una hoja con los siete estados del inventario, siguiendo su texto.
Dos añaden comportamiento:

- **Imposición sin solución** ofrece «Cambiar pliego» y «Cambiar prensa», que llevan al paso 04.
- **Entrada inválida** dice qué regla falla, por ejemplo el múltiplo y el rango de páginas del método, en vez de un mensaje genérico.

### Decisiones abiertas

1. Si «Cara mostrada» debe seguir en la ficha, porque hoy forma parte del estado del store, o puede pasar a ser un estado de la vista.
2. Si la selección actual debe persistirse (punto abierto 1): con una ficha visible, perderla al recargar se notará más.
3. Que el acordeón deje un solo paso abierto a la vez es una hipótesis; hay que probar si alguien necesita comparar dos pasos.
4. La vista a 1024 px está descrita, no dibujada.

### Cómo verificarla antes de construir

- Recorrer el canvas marcando en la tabla de arriba cada control del inventario, para confirmar que no se pierde ninguno.
- Medir en el navegador el contraste de `#5B6B82` y `#0A6285` sobre `#F9F9F7` y `#FCFCFC`.
- Construir primero solo la estructura de tres columnas sobre los componentes actuales, sin tocar tokens, y comprobar con `npm run preview` que a 1440 px no hay desplazamiento de página y a 390 px no hay desplazamiento horizontal.
