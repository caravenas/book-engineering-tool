# Imposición

Imponer es decidir en qué lugar de un pliego de prensa va cada página, para que al plegar y cortar el libro quede en orden.
Cada línea lleva un estado, que la página de terminología de esta carpeta explica.

## Dos preguntas distintas

Hay dos cálculos que se confunden fácil, porque los dos preguntan «cuántas páginas caben en un pliego»:

- **El aprovechamiento geométrico**: cuántas páginas, todas iguales y en una cuadrícula uniforme, caben sobre un pliego de un tamaño dado.
  No mira la máquina ni cómo se pliega: es solo geometría de rectángulos.
  **[supuesto]**
- **La imposición por firmas**: qué esquema de plegado sirve para este libro, en esta prensa y con este pliego, y cuánto papel se pierde con él.
  Es el cálculo que importa para producir, y se explica en la página de firmas y plegado.
  **[supuesto]**

## Cómo entra una página en un pliego

- Lo que se coloca no es la página sino la página con su sangrado a cada lado.
  **[supuesto]**
- Una página cabe en el pliego de prensa si su cuadrícula entra en el área imprimible, que es el pliego menos los márgenes lateral, de pinza y de cola.
  **[supuesto]**
- La cuadrícula puede ir con la página derecha o girada 90°, y se prueba de las dos maneras.
  Si caben las dos, se prefiere la derecha, porque el área que ocupa es la misma.
  **[supuesto]**
- Entre una página y la siguiente va una calle del mismo ancho en los dos sentidos.
  **[supuesto]**
- Un pliego de prensa que no cabe en la prensa, en ninguna de las dos orientaciones, no se puede imprimir en ella.
  Un pliego de prensa colocado con el lado largo en el otro sentido es el mismo pliego, girado.
  **[supuesto]**
- La pinza reserva un borde en un solo lado del pliego; los otros tres bordes llevan el margen lateral y el de cola.
  **[supuesto]**

## Desperdicio

- El desperdicio es la parte del área imprimible que las páginas no ocupan, como porcentaje.
  Entre varios esquemas que caben, el que menos desperdicia es el preferido.
  **[supuesto]**
- Un pliego que deja muchas páginas pequeñas sobre mucho papel pierde más.
  Si una imprenta imprime varias firmas distintas lado a lado en un mismo pliego para aprovecharlo, es algo que este trabajo no modela.
  Si lo hacen, y en qué casos, es **[desconocido]**.

## Qué se sabe de las prensas y los pliegos reales

- Qué tamaños de pliego y qué márgenes de pinza, cola, lado y calle tiene cada prensa de una imprenta concreta es **[desconocido]**.
  Los valores que usa la herramienta son de ejemplo, y los datos públicos de fabricantes se juntan aparte como por confirmar.
- Si una imprenta elige primero el pliego y la prensa, o primero el formato del libro, es **[desconocido]**.
