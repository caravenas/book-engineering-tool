# Plan de PliegoStack

Este es el único compromiso vigente.
El plan anterior está congelado en `docs/legacy/` y es registro, no compromiso.
Lo que explica el producto, el oficio y la construcción vive en `context/`, empezando por `context/product/product-context.md`.

## Dónde estamos

- La pausa del 2026-09-24 sigue en pie, levantada solo para los dos frentes de este plan.
  La levantó la aprobación de la propuesta de tres capas el 2026-10-02.
- Verificado el 2026-10-02 con Node v22.22.2, sobre `f28666c`: `npx tsc --noEmit` en 0, `npm test` con 490 tests en 20 archivos, `npm run build` y `npm run test:browser` con 46 pruebas en Chromium.
- Todos los archivos de datos de `public/config/` declaran `provisional: true`: ningún dato viene de una imprenta.
- Lo que la herramienta hace hoy está en `context/product/capabilities.md`.

## Frente `build`: UX-8, exportar la ficha técnica

**Objetivo.**
Que quien prepara un libro pueda llevarse la ficha técnica de lo que calculó: una página imprimible con las entradas y los resultados del libro actual, que el navegador imprime o guarda como PDF.

**Alcance.**
- Un control «Exportar ficha» que abre esa página.
  Su sitio lo propone el plan del incremento y lo aprueba Chris.
- La página contiene lo que la ficha y la vista de resultados dicen del libro: formato (medidas, proporción, sangrado), papel y gramaje, páginas y encuadernación, imposición (prensa, pliego y esquema), tapa, y las cifras (lomo del papel, de la encuadernación y final, peso, firmas, páginas en blanco, pliegos por ejemplar, desperdicio, medidas de tapa y corrimiento cuando aplica).
- Dice de dónde salen los datos: mientras algún archivo de datos sea de ejemplo lo declara, y cita el origen de cada catálogo.
- Un resultado que no se puede calcular sale con su razón, nunca con una cifra.
- Estilos de impresión propios.
  Sin dependencias nuevas.

**No objetivos.**
- Importar, y exportar los catálogos propios: quedan en `docs/legacy/backlog-heredado.md` (`A-09`).
- Generar el PDF dentro de la aplicación, un PDF de imposición, líneas de troquel, o un archivo JSON.
- Calcular algo nuevo, o cambiar un motor o un archivo de `public/config/`.
- Rediseñar la pantalla fuera del control y de la página de impresión.

**Aceptación.**
1. Un test de interfaz comprueba que, con la configuración por defecto, la ficha lista cada entrada y cada cifra que la pantalla muestra, con los mismos valores que el store.
2. Un test comprueba que, con un dato que impide calcular, la ficha muestra la razón y no una cifra.
3. Un test comprueba que con datos de ejemplo la ficha lo dice y cita el origen, y que no lo dice cuando ningún archivo es de ejemplo.
4. Una prueba de navegador, con los medios de impresión emulados, comprueba que la página cabe en el ancho de una hoja vertical sin desbordar y que no muestra los controles de la herramienta.
5. Se revisa a mano en un navegador real sobre `npm run preview`, con la vista de impresión.
6. `npm test`, `npm run build` y `npm run test:browser` terminan en 0, sin dependencias nuevas.

**Rollback.** Revertir el único commit del incremento.

**Decisiones ya tomadas.**
Exporta la ficha técnica, no los catálogos (2026-10-02, D1).
El formato es una página imprimible, no un archivo (2026-10-02).

## Frente `research`: la ronda de Santiago

**Objetivo.**
Entender a qué imprentas, clientes y editoriales de Santiago de Chile les sirve PliegoStack, y confirmar o refutar los supuestos de `context/domain/`.

**Alcance.**
- Primero, sembrar `context/market/` desde la hoja de prospectos que Chris aprobó.
- Después, una imprenta por vez en el orden de prioridad de esa hoja, dentro de la ronda de Santiago.
- Clientes y editoriales, con hallazgos en `context/market/customers.md` que Chris promueve a `context/product/users.md`.
- Responder las preguntas de `context/market/open-questions.md`.

**No objetivos.**
- Contactar a nadie: los borradores quedan fuera del repositorio y Chris los revisa y envía.
- Nombres o datos de contacto de personas en el repositorio.
- Cambiar código ni archivos de datos: un dato que una imprenta entregue para un archivo de `public/config/` se deja como propuesta, y pasa por este plan.

**Criterio de cierre.**
La ronda se cierra cuando:
1. Cada imprenta de prioridad alta de la ronda tiene un perfil con fuentes y fecha de consulta.
2. Cada uno de los cinco supuestos, `SUP-1` a `SUP-5`, está confirmado, refutado, o declarado sin respuesta con su motivo.
3. Las preguntas 1 a 15 de `context/market/open-questions.md` (a quién le sirve, cómo lo resuelven hoy, clientes y editoriales, y los datos) tienen una respuesta con fuente, o están marcadas sin respuesta con su motivo.
   Las preguntas 21 y 22, sobre qué de lo construido sobra o falta, las responde Chris con lo que la ronda entregue, y no cierran la ronda.

## Promovido desde el legado o desde la investigación

Aquí trae Chris lo que decide construir, con su fecha y su origen.
Un pendiente de `docs/legacy/backlog-heredado.md` o una propuesta de `docs/research/` no es compromiso hasta que aparece en esta sección.

- Vacío al 2026-10-02.

## Cómo se trabaja

- Cada frente es una sesión propia con su territorio de escritura: `build` en `src`, `e2e`, `public`, `context/architecture`, `context/product` y este plan; `research` en `docs/research`, `context/market` y `context/domain`.
  Las reglas de commit, de verificación y de aprobación de push son las de `AGENTS.md`.
- Llevar un supuesto confirmado al código o a `public/config/` es un cambio de este plan: la investigación deja la propuesta en `docs/research/`, Chris la promueve aquí y `build` la implementa.
