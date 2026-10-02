# Terminología del oficio

El vocabulario con el que se habla de preparar un libro álbum para imprimirse.
Es el primer archivo que hay que leer antes de cualquier otro de `domain/`.

## Estados

Cada afirmación de esta carpeta lleva uno de tres estados al final de su línea:

- **[confirmado AAAA-MM-DD]**: se comprobó contra algo real, y la etiqueta dice cuándo y con qué.
  Nunca dice con qué persona.
- **[supuesto]**: lo que el trabajo da por cierto sin haberlo confirmado con una imprenta.
  Es la mejor lectura disponible, no un hecho.
  Los cinco supuestos que más importan llevan además un identificador, `SUP-1` a `SUP-5`, y son el cuestionario de las primeras entrevistas con imprentas.
- **[desconocido]**: se sabe que no se sabe; no hay ni una lectura de partida.

Hoy hay una sola afirmación confirmada: el doblez de la firma de 16 páginas, en `signatures.md`.
No la confirmó una imprenta sino un pliego doblado a mano.
Una confirmación de una imprenta cambia la etiqueta de la línea y deja anotado qué imprenta y cuándo, sin nombrar a nadie.

Ninguna cifra concreta de una imprenta vive en esta carpeta: mientras no esté confirmada es un dato público por confirmar, y cuando se confirma pasa a la configuración de la herramienta.
Aquí se explica el oficio, no los números de un taller.

## Las cosas que se imprimen

- **Página**: una cara de una hoja del libro, la unidad que se numera.
  **[supuesto]**
- **Hoja**: la pieza física de papel del bloque interior, con dos páginas, una por cada cara.
  El libro tiene `ceil(páginas / 2)` hojas, porque una última página impar ocupa igual una hoja entera.
  **[supuesto]**
- **Pliego de prensa**: la lámina grande de papel, sin plegar, que entra a la máquina y en la que se imprimen varias páginas por cada cara.
  **[supuesto]**
- **Firma**: el conjunto de páginas que se imprime en un mismo pliego de prensa y se pliega en un solo paquete.
  Sus páginas son múltiplo de 4, y cada pliego imprime la mitad de ellas por cada cara.
  **[supuesto]**
- **Cuadernillo**: el libro armado con hojas anidadas, como el que se grapa, visto como un solo bloque.
  Si el oficio usa esta palabra y «firma» como sinónimos, o como cosas distintas, es **[desconocido]**.
- **Folio**: el pliego plegado una vez, con cuatro páginas: las dos cubiertas, 4 y 1, quedan juntas en la cara exterior y la 2 y la 3 en la interior.
  **[supuesto]**
- **Tiro y retiro**: las dos caras de un pliego de prensa. El tiro es la primera que se imprime; el retiro, el dorso.
  **[supuesto]**

La palabra «pliego» nombra tres objetos distintos según el momento de la producción: el pliego de prensa sin plegar, la firma ya plegada, y, a veces, el folio de cuatro páginas con que se calcula el corrimiento.
Quien lee un número que dice «pliegos» tiene que saber cuál es.
**[supuesto]**

## La geometría de la hoja

- **Sangrado**: el margen de imagen que se imprime más allá del borde final de la página para que el corte no deje un filo blanco.
  La página «con sangrado» mide la página más el sangrado a cada lado.
  **[supuesto]**
- **Calle**: el espacio entre una página y la siguiente sobre el mismo pliego de prensa.
  **[supuesto]**
- **Margen de pinza**: el borde del pliego de prensa por donde la máquina lo sujeta, que no se puede imprimir.
  **[supuesto]**
- **Margen de cola**: el borde opuesto al de pinza.
  **[supuesto]**
- **Margen lateral**: el borde a cada lado del pliego de prensa.
  **[supuesto]**
- **Área imprimible**: lo que queda del pliego de prensa al restar los márgenes.
  **[supuesto]**
- **Prensa**: la máquina de impresión, con un formato máximo de pliego y sus márgenes propios.
  **[supuesto]**

## El papel

- **Gramaje**: el peso del papel por metro cuadrado, en g/m².
  **[supuesto]**
- **Calibre**: el grosor de una hoja, en micrones.
  **[supuesto]**
- **Sustrato**: el tipo de papel o cartulina, con sus gramajes disponibles, y para cada gramaje su calibre.
  **[supuesto]**
- **Lomo**: el grosor del bloque de hojas visto desde el canto de encuadernación.
  **[supuesto]**

## La encuadernación

- **Grapa o caballete**: las hojas se pliegan por la mitad, se anidan unas dentro de otras y se grapan por el pliegue.
  **[supuesto]**
- **Hotmelt y PUR**: las firmas se apilan y el lomo se pega con un adhesivo, termofusible el primero y de poliuretano el segundo.
  **[supuesto]**
- **Cosido a hilo**: las firmas se apilan y se cosen entre sí por el lomo.
  **[supuesto]**
- **Corrimiento** (en inglés, *creep* o *shingling*): lo que se desplaza hacia afuera cada hoja que está anidada dentro de otras, porque el papel plegado ocupa espacio; hay que compensarlo para que el corte no recorte más a unas páginas que a otras.
  Solo existe si las hojas se anidan.
  **[supuesto]**

## La tapa

- **Tapa blanda**: una sola hoja que envuelve el libro, con el lomo plegado, y con o sin solapas.
  **[supuesto]**
- **Solapa**: la parte de la tapa blanda que se dobla hacia adentro sobre la primera y la última página.
  **[supuesto]**
- **Tapa dura**: dos cartones laterales y un cartón de lomo, forrados con una hoja de papel que envuelve los tres.
  **[supuesto]**
- **Ceja**: lo que el cartón sobresale de las páginas en cabeza, pie y corte.
  **[supuesto]**
- **Canal de bisagra**: el hueco entre el cartón lateral y el cartón de lomo, por donde la tapa abre.
  **[supuesto]**
- **Doblez de forro**: lo que el forro se dobla hacia adentro sobre el canto del cartón.
  **[supuesto]**
