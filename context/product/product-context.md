# PliegoStack: mapa del producto

Este es el archivo raíz del contexto de producto.
Dice qué es PliegoStack, para quién se supone que es, qué problema ataca y dónde está cada cosa.
Cada sección apunta al archivo que la desarrolla; este no repite lo que ellos explican.

## Qué es

PliegoStack es una herramienta de ingeniería editorial para imprentas y editoriales de libros álbum.
Calcula, a partir de las medidas del libro y de los datos de una imprenta, lo que hace falta para imprimirlo: lomo, peso, imposición por firmas, número de pliegos, páginas en blanco, encuadernación y tapa.
Corre entera en el navegador, sin servidor.

## Para quién es, y qué no se sabe

La herramienta se pensó para dos clases de usuario: una imprenta que carga sus datos una vez, y un editor que los cambia a diario.
Esa descripción es un supuesto de partida y no un hallazgo.
Ninguna imprenta ni editorial ha usado la herramienta, y el usuario concreto, el trabajo que le resuelve y lo que usa hoy están sin caracterizar.
Está desarrollado en `users.md`, y la investigación que lo irá llenando, en `../market/open-questions.md`.

## El problema que ataca

Preparar un libro para imprimirse exige decidir muchas cosas que dependen unas de otras: cuántas páginas admite un método de encuadernación, cuántas firmas salen y cuántas páginas quedan en blanco, qué pliego y qué prensa desperdician menos papel, cuánto mide el lomo y, con él, cuánto mide la tapa.
Equivocar una de esas cifras no da un error visible: da un libro mal armado que se descubre ya impreso.
La herramienta calcula todo eso junto y deja ver de dónde sale cada cifra.

Si el problema es tan real para una imprenta chilena como se supone, y con qué lo resuelven hoy, es **lo que la investigación de mercado tiene que responder**.

## Qué hace hoy

Ver `capabilities.md`.
Cinco pasos de especificación, tres vistas de resultados y un editor de catálogos que se guarda en el navegador.
No calcula tirada, merma ni costo.

## El oficio y la construcción

- El oficio: `../domain/terminology.md`, y de ahí `imposition.md`, `signatures.md`, `binding.md`, `cover.md` y `paper.md`.
  Cada afirmación dice si está confirmada, es un supuesto o se desconoce.
- La construcción: `../architecture/overview.md`, `engines.md`, `state.md` y `config.md`.

## Principios

- **Los datos de una imprenta no se compilan en el código.**
  Se leen en tiempo de ejecución de archivos de configuración, y se pueden reemplazar sin recompilar.
- **Un dato dice de dónde sale.**
  Cada archivo de datos declara su origen y si sigue siendo de ejemplo, y la interfaz avisa mientras alguno lo sea.
  Un valor de ejemplo nunca se presenta como dato certificado.
- **Nada inventado.**
  Si falta un dato, como la densidad del cartón, la herramienta no calcula en vez de estimar un número.
- **Los cálculos son funciones puras y rechazan lo que no tiene sentido** con un error explícito, en lugar de devolver una cifra dudosa.
- **El usuario personaliza sobre los datos de fábrica sin copiarlos.**
  Lo que añade, cambia u oculta se guarda aparte, y lo de fábrica sigue siendo la referencia.
- **Primero el navegador.**
  Los datos del usuario viven en su navegador; un servidor con cuentas y configuraciones es una segunda etapa, no una parte del producto de hoy.

## Invariantes

Lo que debe seguir siendo cierto pase lo que pase con el producto:

- Un resultado nunca contradice a otro mostrado al mismo tiempo: todos salen del mismo estado.
- Si un dato de entrada no permite calcular, la herramienta lo dice con una razón y no muestra una cifra.
- Mientras algún archivo de datos declare que es de ejemplo, la cabecera lo dice.
- La herramienta nunca borra el trabajo guardado del usuario por una actualización de los datos de fábrica.

## No objetivos

Ver `non-goals.md`.
