# Propuesta: formatos de prensa y de pliego publicados por Andros Impresores

Fecha: 2026-10-02.
Estado: diferida el 2026-10-02 por decisión de Chris, hasta tener los formatos de 2 o 3 imprentas más; no pasa al plan.
Cuando las haya, esta propuesta se reabre con la comparación.

## Qué se encontró

Andros Impresores, de Santiago, publica dos anexos en PDF, consultados el 2026-10-02:

- `anexo-1-formatos-de-impresión.pdf`: por máquina, papel máximo, impresión máxima y papel mínimo, en centímetros.

  | Máquina | Colores | Papel máx. | Impresión máx. | Papel mín. |
  | --- | --- | --- | --- | --- |
  | Offset | 4 | 72×52 | 70×50,5 | 30×44 |
  | Offset | 5 | 72×102 | 100×70,5 | 38×54 |
  | Offset | 2 | 72×102 | 100×68,5 | 35×54 |
  | Digital | color | 33×48 | 31×46 | 17×25 |
  | Digital | b/n | 33×48 | 31×46 | 17×25 |

- `anexo-2-formatos-pliegos.pdf`: pliegos por papel, con los tamaños de libro que corresponden a cada uno.

  | Pliego (cm) | Papel | Libros (cm) |
  | --- | --- | --- |
  | 72×102 o 77×110 | bond, bond ahuesado y couché | 24×34, 17×24, 11×17 |
  | 66×96 o 66×88 | bond y bond ahuesado | 15,5×23, 15×23, 14×21, 15×21 |
  | 62×92 o 60×90 | couché | 21,5×28, 22×28, 20×27 |

Fuentes:
https://andros.cl/2026/wp-content/uploads/2016/12/anexo-1-formatos-de-impresión.pdf y
https://andros.cl/2026/wp-content/uploads/2016/12/anexo-2-formatos-pliegos.pdf.

## Supuesto que toca

Ninguno de `SUP-1` a `SUP-5`.
Toca los valores de ejemplo de la configuración, que hoy no vienen de ninguna imprenta.

## Qué se propone

Que Chris decida si estos datos públicos entran a la configuración, y cómo.
Leídos contra `context/architecture/config.md`, no todos caben hoy sin inventar algo:

- `public/config/pliegos.json`: los seis formatos de pliego del anexo 2 caben tal cual, con su id, nombre y medidas.
  Es el único archivo que se podría llenar solo con lo publicado.
- `public/config/maquinas.json`: una prensa exige `gripperMargin_mm`, `sideMargin_mm` y `tailMargin_mm`, y el anexo 1 no los da.
  Cargar las prensas obligaría a inventar márgenes, así que no se propone hasta tenerlos de una entrevista.
- `public/config/formatos.json`: no tiene una lista de tamaños de libro, sino proporciones y un ancho inicial.
  Los tamaños de libro del anexo 2 solo entrarían con un cambio del modelo de datos, que sería trabajo de construcción y no se propone aquí.
- `context/architecture/config.md`: documenta los valores de ejemplo de cada archivo que cambie.

Hay además una pregunta de modelo que la decisión tiene que resolver.
`provisional` es un campo de todo el archivo y dice si trae los datos de ejemplo del repositorio o los de la imprenta.
Un dato publicado por una imprenta y no confirmado con ella no es ninguna de las dos cosas: con `provisional: true` la cabecera seguiría avisando, que es lo prudente, pero el campo dejaría de significar exactamente «ejemplo».

## Lo que no se puede cargar todavía

- **Márgenes.**
  El anexo 1 da la impresión máxima, que deja entre 15 y 35 mm de diferencia con el papel máximo según la prensa, pero no cómo se reparten entre pinza, cola y laterales.
- **Qué fuente está al día.**
  La página de impresión describe el offset por clases de colores con otras cifras; si son las mismas máquinas no se sabe.
- **El papel mínimo** no tiene campo en la configuración de hoy.

## Riesgo

Cargar cifras de una sola imprenta como valores por omisión podría leerse como datos de Santiago en general.
Mientras sea así, el `source` tiene que nombrar a la imprenta y decir que son datos publicados, no confirmados.
