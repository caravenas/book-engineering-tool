# Arquitectura: visión general

PliegoStack es una aplicación de una sola página, sin servidor propio, que calcula lo que un libro álbum necesita para imprimirse: lomo, peso, imposición por firmas, encuadernación y tapa.
Todo el cálculo ocurre en el navegador, a partir de datos de imprenta que se leen de archivos JSON en tiempo de ejecución.

## Stack

- React 18 y TypeScript 5.6, con Vite 6 para el desarrollo y el build.
- Zustand 4 para el estado.
- Node 22, fijado en `.nvmrc`.
- Vitest con jsdom y Testing Library para los motores, el store y los componentes.
- Playwright con Chromium en `e2e/` para todo lo que depende de que la página maquete.
  jsdom no calcula layout: allí `getBoundingClientRect` devuelve ceros, y una aserción sobre anchos pasa diga lo que diga el CSS.
- No hay servidor ni base de datos: las dependencias de producción son solo `react`, `react-dom` y `zustand`.

## Capas

```text
public/config/*.json   datos de imprenta (siete archivos)
        │  fetch al arrancar
        ▼
src/config/            loadCatalog, validateCatalog, userLayer
        │  Catalog + UserLayer
        ▼
src/store/             useBookStore: estado, acciones y resultados calculados
        │  llama a
        ▼
src/engine/            funciones puras: units, spine, imposition, signatures, folding, binding, cover
        ▲
        │  lee el store, no calcula
src/components/        la interfaz
```

- **Los motores no importan datos.**
  Reciben todo lo que necesitan como argumentos y solo importan tipos de `src/types/index.ts`.
  Los motores que calculan, salvo `units` (que convierte y da formato) y `folding` (que devuelve una secuencia de dobleces inválida como `{ ok: false, reason }`), rechazan entradas no finitas o fuera de rango con un `RangeError` de mensaje explícito.
  Ver `engines.md`.
- **El store es quien calcula los resultados del libro.**
  Los componentes importan de `src/engine/` solo lo que necesitan para dar formato, dibujar o validar en el lugar donde el usuario teclea: `units`, `layoutSide`, `sheetFitsPress`, `pageCountStep`, `validatePageCount` y, en el catálogo, `planSignatures` para mostrar qué esquemas caben.
  Ver `state.md`.
- **La configuración se carga y se valida antes de montar la interfaz.**
  Ver `config.md`.
- **Los componentes leen el store.**
  Ninguno guarda un resultado propio: la cabecera, los pasos de la ficha y la vista de resultados leen la misma fuente para no poder contradecirse.

## Cómo arranca

1. `src/main.tsx` monta `App`.
2. `App` llama a `loadCatalog()`, que pide los siete JSON de `config/` en paralelo, con un límite de 10 segundos por archivo, y los valida con `validateCatalog`.
3. Si algo falla, la pantalla muestra un bloque con `role="alert"` que lista archivo, ruta del campo y motivo de cada error, y no monta la aplicación.
4. Si todo valida, `App` lee la capa de usuario del almacenamiento del navegador con `readUserLayer` y llama a `initialize(catalog, userLayer)` en el store.
5. `initialize` fusiona el catálogo con la capa de usuario, resuelve cada selección por defecto contra el catálogo efectivo, y corre un primer cálculo.

## La pantalla

- **Cabecera**: el nombre de la herramienta, el distintivo «Datos de ejemplo» (o «Datos de ejemplo en N catálogos» si solo algunos catálogos declaran `provisional: true`; no aparece si ninguno lo declara), el conmutador de la vista central y un resumen de lo que el libro es ahora.
- **Barra de resultados** (`ResultsBar`): lomo, pliegos y peso interior, pegada arriba mientras el resto se desplaza.
  Solo aparece a 1024 px de ancho o menos; por encima, esas tres cifras ya están a la vista en las columnas.
- **Ficha técnica** (columna izquierda, `SpecSteps`): cinco pasos plegables, numerados 01 a 05: Formato, Papel interior, Páginas y encuadernación, Imposición y Tapa.
  Cada uno muestra lo que dice mientras está cerrado.
- **Vista central** (`CentralView`), con tres vistas que se alternan desde la cabecera:
  - *Resultados*: el libro, las seis cifras principales dibujadas, el desglose de lomo, encuadernación, imposición y tapa, y la sección «Cómo se calcula».
  - *Visualización*: los cuatro dibujos a la vez: la página, el lomo, el pliego y la tapa.
  - *Catálogo*: el editor de los catálogos de proporciones, papeles, encuadernaciones, prensas, pliegos y tapas, más la lista de esquemas de plegado, que es de solo lectura.
- **Exportar ficha** (`SpecSheetPage`): un botón al final de la cabecera cambia `App` a una página imprimible con el libro actual.
  El estado `sheetOpen` es local de `App`; la herramienta sigue montada pero oculta (`hidden`), así que al volver conserva la vista, los pasos abiertos y el desplazamiento.
  No es una ruta ni una pestaña porque la selección no se guarda: una pestaña nueva imprimiría el libro por defecto.
  `useSpecSheet` (`specSheet.ts`) arma el contenido como datos a partir de las mismas derivaciones que la pantalla (`useBookFigures`, los `getAll*` y los textos de error de los motores), y el componente solo lo maqueta; los estilos de impresión están en `index.css`.
- **Avisos**: uno si el almacenamiento del navegador no está disponible o falla una escritura, y otro si hay cambios guardados que ya no corresponden a ninguna entrada del catálogo (huérfanos).
- A 1024 px de ancho o menos (un teléfono, una tableta o una ventana estrecha) la página es una columna y la ficha arranca con sus cinco pasos cerrados; el criterio se lee una sola vez, al montar.

## Mapa de `src/`

| Ruta | Contiene |
|---|---|
| `engine/` | Los siete motores puros. |
| `config/` | `loadCatalog.ts` (red), `validateCatalog.ts` (reglas), `userLayer.ts` (persistencia de la capa de usuario). |
| `store/useBookStore.ts` | El store y sus acciones, y los resultados calculados. |
| `types/index.ts` | Todos los tipos compartidos: catálogo, capa de usuario, resultados de cada motor, estado del store. |
| `components/` | Un componente por paso, por dibujo y por bloque de resultados, más el editor de catálogos. |
| `styles/index.css` | La única hoja de estilos, con los tokens visuales como variables CSS. |
| `__tests__/` | Pruebas de motores, validador, capa de usuario, store y componentes. |

Fuera de `src/`: `public/config/` (los datos), `e2e/` (el arnés de navegador), `dist/` (el build, que se regenera).

## Decisiones de fondo

- **Los datos de imprenta no se compilan en el código.**
  Viven en `public/config/` y se vuelven a leer en cada carga de página, así que se pueden reemplazar sin recompilar.
  Cada archivo declara de dónde salen (`source`) y si siguen siendo de ejemplo (`provisional`).
- **La personalización del usuario es una capa aparte, no una copia del catálogo.**
  Se guarda solo lo que el usuario añadió, cambió u ocultó, y el catálogo efectivo se calcula en cada carga.
  Ver `state.md`.
- **Un cálculo que no se puede hacer es un resultado, no una excepción en pantalla.**
  El store captura el error de un motor y lo deja como texto en el campo de error de ese resultado, y los demás resultados se siguen calculando.
  La excepción es el corrimiento, cuyo error se absorbe sin texto cuando ya lo explica otro resultado.
