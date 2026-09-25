# Handoff: Orchestrator → PliegoStack: a qué imprentas les sirve, contexto de producto y replanteo del plan

Date: 2026-09-24
Agent target: claude

## Role

Orchestrator

## Objective

PliegoStack: a qué imprentas les sirve, contexto de producto y replanteo del plan.

Decisión de Chris el 2026-09-24: se pausa el trabajo de interfaz y se abre una investigación de mercado, de la que saldrán un contexto de producto y un plan replanteado.
Empieza en sesión nueva a propósito.
La sesión anterior pasó tres días puliendo esta interfaz al píxel, y es la peor situada para concluir que parte de ella sobra; esa distancia es el punto.

## Repository/path

/Users/christopheraravena/Projects/book-engineering-tool

## Context

Lee `docs/PLAN.md` antes de nada.
Su bloque «Estado actual» está al día desde el 2026-09-24, y cada incremento cerrado dice ya en qué commit aterrizó.

La sesión anterior cerró el rediseño de interfaz completo, R-1 a R-31, y la primera pasada de móvil.
Verificado el 2026-09-24 sobre `8402c3e` con Node v22.22.2: `npx tsc --noEmit` en 0, `npm test` con 490 tests en 20 archivos, `npm run build` en 0, y `npm run test:browser` con 46 pruebas en Chromium.

Lo que la herramienta hace hoy: cuatro motores puros en `src/engine` —imposición por firmas respetando pinza, márgenes y calles; encuadernación con corrimiento; tapa blanda y dura; lomo y peso—, un catálogo de siete archivos en `public/config` que el taller puede ampliar y que persiste en el navegador, y una interfaz de dos columnas con tres vistas centrales.
No existe cálculo de tirada, merma ni costo: ese es el incremento 5, y nunca se empezó.

**El activo más valioso para esta investigación son los cinco supuestos que el propio repo declara sin confirmar**, en «Decisiones pendientes» de `docs/PLAN.md`: la densidad del cartón, las tolerancias de encajado en tapa dura, dónde cae el sangrado en una solapa, si el corrimiento se cuenta siempre en grupos de 4, y cuál de los dos dobleces se salta para hacer una firma de 8 páginas.
No son deuda técnica: son el guion de la primera entrevista con una imprenta.
La misma llamada que valida el mercado valida el motor.

Chris ya hizo una primera aproximación con ChatGPT.
Pídesela como archivo y ponla en el repo como entrada de la investigación, no pegada en el chat: así los hallazgos nuevos se distinguen de los supuestos previos, y cada uno se puede contradecir citando fuente.

Los seis archivos de `public/config` que declaran `source` declaran también `provisional` en `true`, así que la cabecera avisa de que los datos son de ejemplo.
Una imprenta real que entregue sus datos es lo que los pone en `false` y apaga el distintivo.
Conseguir uno de esos seis juegos de datos vale más que cualquier hallazgo de escritorio.

No hay playbook de investigación en `~/.agents/playbooks`: solo `architecture-review`, `bug-fixing` y `feature-development`.
Rol `Researcher` sí hay, en `~/.agents/roles`.
Si el proceso que montes funciona, regístralo como playbook nuevo al terminar.

`Researcher` lleva `bash` pero ni `edit` ni `write`, así que no necesita worktree y corre en el checkout compartido, según `~/.agents/docs/orchestration.md`.
Una fase de escritorio no necesita aislamiento; el worktree aparece cuando alguien vaya a escribir código.

Presupuesto y evidencia: toda llamada lateral declara por adelantado qué bucket de proveedor gasta, y deja su transcripción en un archivo.
Un worker sin artefacto no cuenta como trabajo hecho, y el autoinforme de un CLI no es evidencia.

Estado de git al empezar: `master` con 8 commits por delante de `origin/master`.
Chris empuja a mano, y el candado de pre-push exige revisión independiente de todo lo que el push publicaría, no solo del último commit.

## Scope

Investigación de mercado: qué tipos de imprenta y editorial tienen este problema, con qué lo resuelven hoy —hojas de cálculo, software de imposición, calculadoras del proveedor de papel, o nada—, de qué tamaño son, en qué geografía, y dónde PliegoStack encaja y dónde no.

Escribir `docs/PRODUCT-CONTEXT.md`: para quién es, qué trabajo resuelve, qué alternativas existen, qué decisiones de producto quedan abiertas, y qué de lo ya construido sobra o falta a la luz de los hallazgos.

Replantear el plan con los hallazgos.
Decide con Chris si vive en `docs/PLAN.md` o en un documento nuevo: PLAN.md pasa de 1300 líneas y su orden de incrementos se fijó antes de esta investigación.

Dejar registro: una decisión en `docs/decisions` por cada elección de producto que cambie el rumbo, escrita con `record-decision.mjs` y `--record-scope project`.

## Files allowed

- `docs/PRODUCT-CONTEXT.md`, nuevo.
- `docs/research/`, nuevo: la aproximación previa de Chris y las fuentes de la investigación.
- `docs/decisions/` y `docs/learnings/`, escritos con `record-decision.mjs` y `record-learning.mjs` con `--record-scope project`.
- `docs/PLAN.md`, solo después de que Chris apruebe el replanteo.

## Files not allowed

- `src/`, `public/config/` y `e2e/`: esta etapa no toca código ni datos de catálogo.
- Los dos archivos que este repo declara protegidos, el contrato de verificación y su propia declaración de política: los edita Chris a mano, a propósito, y nombrarlos en un comando de shell ya se rechaza.
- La memoria global en `~/.agents/memory`: solo se escriben candidatos con los scripts, y los promueve una sesión de curación.

## Workflow stage

explore

## Expected output

- `docs/PRODUCT-CONTEXT.md`, con cada afirmación de mercado acompañada de su fuente y su fecha de consulta, y separando lo verificado de lo supuesto.
- El plan replanteado, donde Chris decida que viva, con su orden de incrementos y el criterio por el que se ordenan.
- Una lista corta y explícita de lo que la investigación invalida de lo ya construido, si invalida algo.
- El cuestionario para una imprenta real, ordenado, con las cinco preguntas pendientes del repo dentro.

## Validation

- Cada cifra de mercado con fuente citada y fecha de consulta; lo que no tenga fuente se declara supuesto, no dato.
- Ninguna afirmación sobre la app sin comprobarla en el código: los motores de `src/engine` y los archivos de `public/config` son la fuente, no el recuerdo de otra sesión.
- Verifica el estado del repo con git antes de planificar, y no te fíes del autoinforme de ningún worker.
- Si alguna etapa llega a tocar código, el contrato de verificación del repo corre entero antes del commit: typecheck y la suite de Vitest, más el arnés de navegador si hay cambio visible.

## Open questions

- Qué geografía primero: Chile, LatAm, España, o donde Chris tenga contacto real con un taller.
- La investigación se queda en escritorio o incluye entrevistas con talleres reales.
- El plan replanteado va dentro de `docs/PLAN.md` o en un documento nuevo.
- Siguen en pie UX-7, la pantalla de Configuración, y UX-8, exportar e importar, en pausa desde el 2026-09-19, ahora que el catálogo es una de las tres vistas centrales.
- Qué hace la herramienta cuando el taller ya tiene un RIP o un software de imposición: conviven, exporta hacia él, o compite con él.

## Explicit do-not-do list

- No implementes código en esta etapa: para en el plan y espera la aprobación de Chris, que es lo que `orchestration.md` exige antes de pasar de planear a implementar.
- No inventes nombres de imprentas, tamaños de mercado ni cifras: sin fuente es supuesto, y se declara como supuesto.
- No metas datos de contacto de personas en el repo.
  Datos de empresa —tamaño, máquinas, catálogo, ciudad— sí; nombres, correos y teléfonos no.
- No toques `docs/PLAN.md` antes de que Chris apruebe el replanteo.
- No empujes a `origin`: Chris empuja a mano.
- No paralelices sin dos flujos de trabajo genuinamente independientes, y no bajes más de dos niveles por debajo del capitán.

## Return format

Return a concise report with:

- findings or work completed;
- files inspected or changed;
- validation run;
- risks/assumptions;
- recommended next step.
