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

## La propuesta que salió de aquí

Este documento describe la app tal como era en `cfaefd0` y no cambia cuando la app cambie.
El rediseño que se redactó a partir de él vive en `docs/UI-REDESIGN.md`.
