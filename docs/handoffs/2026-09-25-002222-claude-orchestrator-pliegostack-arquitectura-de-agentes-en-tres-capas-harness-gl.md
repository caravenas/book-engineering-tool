# Handoff: Orchestrator → PliegoStack: arquitectura de agentes en tres capas, harness global, harness de producto y contexto de producto

Date: 2026-09-25
Agent target: claude

## Role

Orchestrator

## Objective

PliegoStack: arquitectura de agentes en tres capas, harness global, harness de producto y contexto de producto

## Repository/path

/Users/christopheraravena/Projects/book-engineering-tool

## Context

Este handoff absorbe el del 2026-09-24, docs/handoffs/2026-09-24-225018-claude-orchestrator-pliegostack-a-que-imprentas-les-sirve-contexto-de-producto-y.md, que pedia un docs/PRODUCT-CONTEXT.md. Ese entregable no se crea como archivo suelto: aterriza en context/product/ y context/market/. La investigacion de mercado que aquel handoff abria sigue pendiente, y su hueco se estructura y se declara desconocido, no se rellena con supuestos.

El harness global ya existe en ~/.agents y no se reimplementa ni se copia: roles/ con ocho contratos, patterns/ con once tecnicas seleccionables, schemas/ con cinco contratos de salida, playbooks/ con feature-development, bug-fixing y architecture-review, workflows/ con enrutamiento rol a familia y modelo, y docs/cognitive-library.md, docs/orchestration.md, docs/cli-adapters.md y docs/worker-routing-responsability-v2.md.

La separacion es en tres capas. Global Harness, como trabajan los agentes en todas partes, vive en ~/.agents. Product Harness, como trabajan los agentes en este producto, vive en el directorio .agents del repo y contiene solo maquinaria. Product Context, que debe saber un agente sobre el producto, vive en context/ en la raiz, visible. El Harness es el como, el Context es el que y el por que.

La distribucion de directorios esta decidida y no se reabre. El criterio que decide si algo es maquinaria es una pregunta: si mañana se borraran todos los agentes del proyecto, ese archivo se conservaria. Un documento de dominio, un ADR y un plan se conservan; un handoff no. El eje que separa context/ de docs/ no es el tema sino el contrato de mutacion: context/ es estado, que se edita en sitio y cuyo desfase es un defecto; docs/ es compromiso e historia, donde un registro fechado y viejo es correcto por definicion.

Movimientos previstos, solo despues de la aprobacion: docs/CONFIG.md y el bloque Estado actual de docs/PLAN.md pasan a context/, este ultimo partido por tipo de documento. Se quedan en docs/ el PLAN con sus incrementos, UX-REVIEW.md, UI-REDESIGN.md, UI-INVENTORY.md (es un evento del 2026-09-19, previo al rediseño), decisions/, handoffs/ y learnings/. docs/research/ no existe y no se crea salvo que un flujo aprobado escriba en ella. Un hecho, una casa: PLAN.md apunta a context/ y no repite su contenido, que es lo que le quita peso a sus 1300 lineas.

El brief completo, de unas 270 lineas, se entrega pegado al inicio de la sesion y no se commitea: es un artefacto de un solo uso que caduca al aprobarse la Fase 0. Lo durable es este handoff y el ADR que salga de la decision. La version vigente del brief, revisada el 2026-09-26 contra el repo y ~/.agents, esta fuera del repo en ~/Documents/pliegostack-prompt-tres-capas-v3.md; si no esta, pidesela a Chris antes de empezar.

Estado verificado el 2026-09-26: master limpio sobre 7588837, al dia con origin/master. Chris empuja a mano, y el candado de pre-push exige revision independiente de todo lo que el push publicaria.

## Scope

Fase 0, antes de tocar un solo archivo: leer el harness global y el proyecto, y entregar el inventario de lo que ya existe, el delta minimo a la capa global, el detalle dentro de context/ y de .agents/, la interfaz entre capas como contrato explicito, el plan de migracion por fases con verificacion y rollback, y las decisiones que requieren aprobacion de Chris. Parar ahi.

Capa 2, Product Harness: definir los flujos build-feature, fix-bug, research-printer, enrich-printer, contact-printer y analyze-quote. Los dos primeros reusan los playbooks globales y se extienden por parametros en vez de clonarse. Cada flujo declara rol, patrones, schema de salida, fuentes de contexto con el bloque context_sources que playbooks/README.md ya define, puertas humanas y modo proporcional. Flujos explicitos y observables, no un enjambre.

Capa 3, Product Context: context/product/ con product-context.md como mapa raiz, context/domain/ con un concepto por archivo y referencias cruzadas en Markdown plano, context/architecture/ y context/market/. Separar conocimiento de dominio de datos operacionales: lo que es verdad sobre imprimir un libro va en context/domain/, lo que es verdad sobre una imprenta concreta vive en public/config y se documenta en su sitio. Procedencia en todo hallazgo, reusando la convencion de source y provisional que los JSON ya tienen.

Si la auditoria concluye que el harness global necesita un delta, eso es una segunda sesion con cwd en ~/.agents, su propio commit y su propio contrato de verificacion. Una sesion no commitea en dos repos.

## Files allowed

- context/, nuevo, con sus cuatro subdirectorios.
- El directorio .agents del repo, para los playbooks del proyecto. No para la declaracion de politica, que esta protegida.
- docs/decisions/ y docs/learnings/, escritos con record-decision.mjs y record-learning.mjs con --record-scope project.
- docs/CONFIG.md, docs/UI-INVENTORY.md y AGENTS.md del proyecto, solo para el movimiento y las referencias que rompe, y solo despues de que Chris apruebe la propuesta.

## Files not allowed

- src/, public/config/ y e2e/: esta etapa no toca codigo ni datos de catalogo.
- docs/PLAN.md, hasta que Chris apruebe el replanteo.
- Los dos archivos que este repo declara protegidos, el contrato de verificacion y su propia declaracion de politica: los edita Chris a mano, y nombrarlos en un comando de shell ya se rechaza.
- La memoria global en ~/.agents/memory: solo se escriben candidatos con los scripts, y los promueve una sesion de curacion.
- Cualquier escritura en ~/.agents: si hace falta un delta global, va en otra sesion con ese cwd.

## Workflow stage

plan

## Expected output

- Inventario de que capacidad pedida ya existe y donde, con rutas.
- Delta minimo a la capa global con justificacion por adicion, o la afirmacion de que no hace falta ninguna.
- El detalle dentro de context/ y de .agents/: que archivo vive en cada directorio y cual de los existentes se mueve.
- La interfaz entre capas escrita como contrato pequeño: que puede leer cada capa de la de abajo, y que no puede saber la de abajo de la de arriba.
- Plan de migracion incremental con criterio de verificacion y rollback por fase.
- Lista de decisiones que requieren aprobacion de Chris, con recomendacion para cada una, y lista de lo descartado con su razon.

## Validation

- No implementar nada antes de la aprobacion de Chris: es lo que orchestration.md exige para pasar de planear a construir.
- Ninguna afirmacion sobre la app sin comprobarla en el codigo: los motores de src/engine y los JSON de public/config son la fuente, no el recuerdo de otra sesion.
- Verificar el estado del repo con git antes de planificar, y no fiarse del autoinforme de ningun worker.
- Si alguna fase llega a tocar codigo, el contrato de verificacion corre entero antes del commit: npx tsc --noEmit, npm test, npm run build, y npm run test:browser si hay cambio visible, con Node 22.22.2.
- Una fase que solo toca documentacion lo dice, y no finge haber corrido una suite que no aplicaba.

## Open questions

- Los especialistas de dominio son roles globales nuevos, lo que obliga a tocar VALID_ROLES y la generacion de agentes, o son pasos de playbook y skills del proyecto que no tocan el vocabulario global.
- El plan replanteado se queda dentro de docs/PLAN.md o nace como documento nuevo. La decision del 2026-09-24 dejo esta pregunta abierta a Chris.
- Que relacion tienen research-printer y enrich-printer con la investigacion de mercado pendiente: si son ese trabajo formalizado o algo distinto.
- Si docs/UX-REVIEW.md y docs/UI-REDESIGN.md conservan algun incremento vivo, ahora que el rediseño cerro y UX-7 y UX-8 llevan en pausa desde el 2026-09-19.

## Explicit do-not-do list

- No implementes codigo en la Fase 0: para en la propuesta y espera la aprobacion de Chris.
- No reabras la distribucion de directorios: esta decidida.
- No copies el harness global dentro del proyecto, ni crees una capa de abstraccion sobre el.
- No montes wiki, grafo de conocimiento, backlinks ni indices generados: Markdown con enlaces relativos y basta.
- No crees ninguna carpeta por simetria que no tenga un consumidor hoy, ni configuracion que ningun hook consuma. Un permiso que nada aplica no es un permiso.
- No añadas dependencias sin aprobacion de Chris.
- No inventes cifras de mercado ni nombres de imprentas, y no metas datos de contacto de personas en el repo: datos de empresa si, nombres, correos y telefonos no.
- No empujes a origin: Chris empuja a mano.

## Return format

Return a concise report with:

- findings or work completed;
- files inspected or changed;
- validation run;
- risks/assumptions;
- recommended next step.
