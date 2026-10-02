# 2026-10-02 — Donnebaum: verificación del perfil público

Quinta imprenta de prioridad alta de la ronda de Santiago.
Sin contacto con la imprenta: solo sus páginas públicas.

## Fuentes consultadas

Todas el 2026-10-02:

- https://donnebaum.com/
- https://donnebaum.com/impresion
- https://donnebaum.com/cotizador/libros, que carga en un marco https://donnebaum.com/cotizador-libros.html?familia=libros
- https://garabat.cl/, enlazado desde Donnebaum como marca del grupo.

## Cómo se leyó el cotizador

El cotizador de libros se leyó por el texto que muestra a quien lo visita: sus campos, sus opciones, sus avisos y los resultados que presenta.
En esta sesión se miró brevemente su código buscando reglas de cálculo; se dejó de hacerlo porque no es una fuente pensada para el público, se borraron las copias locales, y nada de lo que contiene entra a este repositorio ni a ninguna conclusión: ni constantes, ni fórmulas, ni costos.
Lo que aquí se anota es solo lo visible sin clave.

## Hallazgos

| Hallazgo | Estado | Fuente |
| --- | --- | --- |
| Imprenta industrial B2B con más de 40 años en Maipú; grupo con impresión, tarjetas PVC, cierres y estampado textil. | verificado que lo declara | donnebaum.com |
| 558 clientes activos; turnos continuos; líneas duplicadas. | verificado que lo declara | impresion |
| Digital HP Indigo, Xerox y Ricoh; offset sin máquinas nombradas. | verificado en el sitio | donnebaum.com e impresion |
| Rústica, tapa dura, hotmelt, laminados, barnices UV y troquelado en planta. | verificado en el sitio | impresion |
| Imprime «libros de texto y a color con grandes editoriales»; nombra textos escolares y editoriales entre sus clientes. | verificado que lo declara | impresion |
| Cotizador público de libros y revistas con tipo de publicación, tamaño (a medida hasta 320×900 mm), páginas, papeles, tapa blanda, dura o emplacada, solapas con ancho, guardas en tapa dura, ocho tipos de encuadernación e insertos. | verificado en lo visible del cotizador | cotizador-libros |
| El cotizador muestra páginas por pliego y pliegos por ejemplar sobre un «pliego estándar», y un resumen de pliegos color y blanco y negro. | verificado en lo visible del cotizador | cotizador-libros |
| Aviso visible: «La encuadernación no puede ser Hotmelt si el interior es de un sustrato superior a los 170g/m²». | verificado en lo visible del cotizador | cotizador-libros |
| Lista visible de precios por pliego de 47,2×32 cm. | verificado en lo visible del cotizador | cotizador-libros |
| Su grupo incluye un sello editorial de libros ilustrados, Garabat, con retiro en la misma dirección. | verificado en los sitios | donnebaum.com y garabat.cl |
| El cotizador hace para el cliente parte de lo que calcula PliegoStack. | inferencia | cotizador-libros |

## Correcciones a la hoja

Comparando con la hoja de prospectos citada en `context/market/printers.md`:

- La hoja dice «encuadernación en planta; detalle no publicado»: el sitio publica rústica, tapa dura y hotmelt, y el cotizador ocho tipos.
- La hoja no menciona el cotizador de libros, que es lo más relevante de esta imprenta para PliegoStack.

## Supuestos del oficio

Ninguno de `SUP-1` a `SUP-5` se confirma ni se refuta.
El cotizador pide el ancho de las solapas y ofrece guardas, lo que toca `SUP-3` y `context/domain/cover.md`, pero lo visible no dice dónde va el sangrado.

## Preguntas abiertas que toca

- Pregunta 6, con qué resuelven hoy lo que calcula PliegoStack: una respuesta con fuente, para una imprenta.
  Donnebaum tiene un cotizador propio que calcula pliegos por ejemplar; si su preprensa usa otra herramienta para imponer, no se sabe.
- Pregunta 8, si la herramienta convive, exporta o compite: en Donnebaum, el cálculo de pliegos ya está dentro de su cotizador.
  Sigue abierta: falta saber si les falta algo que PliegoStack sí haga.
- Pregunta 10: abre un caso de editorial en `context/market/customers.md`.

## Para una entrevista

- Qué hace su cotizador con un libro álbum de tapa dura, y qué cifras corrige la preprensa después.
- De dónde salen las reglas del cotizador, como la de hotmelt y 170 g, y quién las mantiene.
- Si su sello editorial prepara los libros con la imprenta del grupo, y con qué herramienta.

## Siguiente paso

Portal Gráfico.
