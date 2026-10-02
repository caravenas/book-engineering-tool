# Firmas y plegado

Una firma es el paquete de páginas que sale de plegar un pliego de prensa impreso por las dos caras.
Los estados de cada línea están explicados en `terminology.md`.

## Qué es un esquema de plegado

- Un pliego de prensa lleva una cuadrícula de páginas en cada cara, y el esquema dice qué página va en cada lugar de la cuadrícula y con qué giro: derecha o a 180°.
  **[supuesto]**
- Cada lugar de la cuadrícula tiene una página en el tiro y otra en el retiro, así que las páginas de una firma son el doble de los lugares de una cara.
  Una firma de 8 páginas es una cuadrícula de 2 por 2; una de 16, de 2 por 4.
  **[supuesto]**
- Las dos páginas que comparten un lugar son las dos caras de una misma hoja: una impar y la siguiente.
  **[supuesto]**
- El dorso del pliego se indexa como se ve al darle la vuelta sobre su eje vertical: el lugar de la fila y la columna del frente tiene su dorso en la misma fila y la columna espejada.
  **[supuesto]**
- Un esquema no es un conjunto de medidas: es el emparejamiento de qué página cae en qué hueco y con qué giro.
  Equivocarlo no da un número raro sino un libro con las páginas desordenadas, y no se nota hasta que está impreso.
  **[supuesto]**

## El esquema sale de los dobleces

- Lo que una imprenta sabe de memoria no es la cuadrícula sino cómo se dobla el pliego, así que el esquema se deriva de la secuencia de dobleces y no se teclea.
  **[supuesto]**
- Un doblez toma una mitad del paquete, la da vuelta sobre la otra, y esa mitad queda encima con su orden invertido.
  Dobla sobre una línea horizontal, además, deja el contenido de cabeza respecto del paquete; sobre una línea vertical, no.
  De ahí salen los giros de 180° de un esquema.
  **[supuesto]**
- Qué cara del pliego queda hacia afuera del paquete es parte del plan de plegado y no una propiedad de la cuadrícula; con la otra cara hacia afuera sale otro esquema, igualmente correcto.
  **[supuesto]**
- Un esquema correcto, doblado, entrega las páginas en orden: 1, 2, 3, y así hasta el final.
  Leerse en orden prueba que cada hoja está bien emparejada, pero no dice con qué giro se imprime cada página.
  **[supuesto]**

## Lo único confirmado

- La firma de 16 páginas se dobla de abajo hacia arriba, luego la izquierda sobre la derecha, luego de arriba hacia abajo, con el dorso del pliego hacia afuera del paquete.
  Se dedujo de las páginas que se leyeron en un pliego doblado a mano, entre las doce secuencias que dan una cuadrícula de 2 por 4, y solo una las reproduce.
  Antes se había supuesto otra secuencia, con los dos dobleces horizontales seguidos y en el mismo sentido, que no era la real: el modelo de un doblez no se puede dar por bueno sin doblar papel.
  **[confirmado 2026-09-23]** con un pliego doblado a mano, no con una imprenta.

## La firma de 8 páginas

- **SUP-5.** La firma de 8 páginas se imagina como la misma secuencia de 16 páginas con un doblez menos.
  Cuál de los dos dobleces se salta una imprenta para hacerla no está confirmado.
  Las dos alternativas se leen en orden y son imposiciones correctas, pero ponen las páginas en huecos distintos: saltando el último doblez o saltando el primero.
  **[supuesto SUP-5]** Se confirma doblando un papel o preguntando a una imprenta.

## Modo de impresión

- Un esquema se puede imprimir con una sola plancha dando la vuelta al pliego si, en cada fila, la posición espejada del dorso tiene el mismo giro que la del frente.
  Si no, hacen falta planchas separadas para el tiro y el retiro.
  Es una simplificación geométrica, no una simulación de preprensa.
  **[supuesto]**

## Páginas en blanco y cantidad de firmas

- El número de firmas por ejemplar es el total de páginas dividido por las de una firma, redondeado hacia arriba.
  Las páginas que sobran para completar la última firma quedan en blanco.
  **[supuesto]**
- Si la imprenta rellena esas páginas en blanco con algo, o ajusta el total de páginas del libro para evitarlas, es **[desconocido]**.
- Qué otros esquemas, además de los de 8 y 16 páginas, usan las imprentas, y con qué secuencia de dobleces, es **[desconocido]**.
