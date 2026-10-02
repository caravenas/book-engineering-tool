# Qué hace la herramienta hoy

Lo que un usuario puede hacer con PliegoStack, en sus términos y no en los del código.
Comprobado contra el código fuente; cómo está construido cada cálculo está en `../architecture/engines.md`, y por qué el oficio lo hace así, en `../domain/`.

## La ficha técnica: cinco pasos

La columna izquierda es la ficha técnica del libro, en cinco pasos plegables que muestran lo que dicen aun cerrados:

1. **Formato.**
   Elegir el formato (vertical, apaisado o cuadrado), una proporción de página o dejarlo en manual, ajustar el ancho y el alto, y fijar el sangrado.
   La unidad se puede cambiar entre métrica e imperial; los cálculos son siempre en milímetros.
2. **Papel interior.**
   Elegir un papel y su gramaje, o añadir los propios.
3. **Páginas y encuadernación.**
   Fijar el total de páginas y el método de encuadernación.
   La herramienta rechaza un número de páginas que el método no admite, dice por qué y sugiere los dos valores válidos más cercanos.
4. **Imposición.**
   Elegir el pliego y la prensa, y dejar que la herramienta escoja el esquema de plegado que menos papel desperdicia, o fijar uno.
5. **Tapa.**
   Elegir el tipo de tapa, blanda con o sin solapas, o dura.

## Lo que calcula

- **Lomo**: el grosor del papel interior, y el lomo final al sumarle lo que aporta el método de encuadernación, por separado y sumados.
- **Peso**: el del papel interior y el del papel de tapa.
- **Imposición por firmas**: qué esquemas de plegado caben en el pliego con esa prensa, cuál desperdicia menos, cuántas firmas salen por ejemplar, cuántas páginas quedan en blanco, cuántos pliegos de prensa lleva cada ejemplar y si se imprime con una plancha o con planchas separadas.
- **Aprovechamiento geométrico del pliego**: cuántas páginas caben, y de qué manera, sobre el pliego elegido.
- **Corrimiento**: para los métodos que anidan las hojas, cuánto se desplaza cada hoja.
- **Tapa blanda**: el ancho y el alto de la hoja con lomo, sangrado y solapas.
- **Tapa dura**: las medidas de los cartones laterales, del cartón de lomo y del forro, y la superficie de cartón.

Todo se recalcula a la vez cuando cambia cualquier dato, y cada resultado que no se puede calcular dice por qué, salvo el corrimiento, que se omite sin mensaje cuando otro resultado ya explica el problema.

## Cómo lo muestra

- **Resultados**: el libro, las seis cifras principales dibujadas, el desglose de lomo, encuadernación, imposición y tapa, y una sección con las fórmulas.
- **Visualización**: los cuatro dibujos a la vez: la página, el lomo, el pliego con su frente y su dorso, y la tapa.
- **Catálogo**: el editor de los catálogos.
- En un ancho de pantalla pequeño, una barra fija arriba mantiene a la vista lomo, pliegos y peso interior.

## El catálogo y los datos propios

- Siete archivos de datos, que se leen al cargar la página y se pueden reemplazar sin recompilar.
- Para proporciones, papeles, tapas, pliegos, prensas y encuadernaciones, el usuario puede añadir entradas propias, editarlas y eliminarlas, cambiar una entrada de fábrica o ocultarla, y volver a la de fábrica.
- Lo que cambia se guarda en el navegador de quien lo hizo.
  No sale de ahí.
- Los esquemas de plegado son de solo lectura.
- Mientras algún archivo de datos declare que es de ejemplo, la cabecera lo dice, y cada catálogo muestra de dónde salen sus datos.
  **Hoy todos los datos incluidos son de ejemplo, y ninguno viene de una imprenta.**

## Lo que no hace

- **Tirada, merma ni costo.**
  Se rechazó construirlo antes de hablar con una imprenta, porque depende de precios y mermas que solo ella conoce.
- **Exportar ni importar nada**: ni la ficha técnica, ni el resultado, ni los catálogos propios.
  Para llevar sus datos a otro equipo, el usuario no tiene hoy ningún camino.
- **Generar un PDF de imposición, líneas de troquel ni nada que lea una máquina.**
- **Dar de alta esquemas de plegado nuevos.**
  El cálculo que los derivaría existe, pero no tiene pantalla.
- **Imponer varias firmas, o trabajos con páginas de distinto tamaño, en un mismo pliego.**
- **El peso del cartón** de una tapa dura.
- **Recordar la selección actual**: tras recargar, vuelven los valores por defecto; solo se guardan los catálogos propios.
- **Cuentas, usuarios ni servidor.**
- **Sobrecubiertas, camisas ni fajas.**

## Cómo llegó hasta aquí

La herramienta se construyó en cuatro incrementos de cálculo (configuración en tiempo de ejecución, imposición por firmas, encuadernación, y tapa blanda y dura), seis incrementos de una revisión de experiencia de usuario, y un rediseño completo de la interfaz.
El registro de ese trabajo y de lo que dejó abierto está en `docs/legacy/`.
