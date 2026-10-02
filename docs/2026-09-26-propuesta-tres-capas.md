# Propuesta — PliegoStack en tres capas: harness global, harness de producto y contexto de producto

Fecha: 2026-09-26, reescrita el 2026-10-01 y completada con las decisiones de Chris el 2026-10-02.
Etapa: Fase 0 del brief `~/Documents/pliegostack-prompt-tres-capas-v3.md`, con el handoff `docs/handoffs/2026-09-25-002222-claude-orchestrator-pliegostack-arquitectura-de-agentes-en-tres-capas-harness-gl.md` como entrada.
Estado: **aprobada por Chris el 2026-10-02**, con las decisiones de la sección 9; la migración no ha empezado.
No se ha creado ni movido ningún archivo aparte de este.

## Qué persigue

Dos propósitos de Chris, que ordenan todo lo demás:

1. **Dejar como legado el plan anterior y sus pendientes.**
   `docs/PLAN.md`, `UX-REVIEW.md`, `UI-REDESIGN.md` y `UI-INVENTORY.md` dejan de ser compromiso y pasan a ser registro, con un único índice de lo que quedó abierto.
2. **Dos carriles en paralelo y completamente independientes.**
   `research` investiga producto, clientes, editoriales e imprentas en Santiago; `build` construye.
   Ninguno escribe en el territorio del otro.
   `research` escribe una cosa que `build` lee, `context/domain/`, que es documentación del oficio; llevar un supuesto confirmado a código o a datos sigue pasando por el plan y por `build`.

Las tres capas (harness global, harness de producto, contexto de producto) son el medio, no el fin.

## Decisiones de Chris del 2026-10-02

| | Decisión |
|---|---|
| D1 | `build` construye la exportación de la ficha técnica (UX-8) |
| D2 | Clientes y editoriales van en `research`; sus hallazgos viven en `context/market/` y Chris los promueve a `context/product/users.md` |
| D3 | **Cambia respecto a la recomendación**: cuando una imprenta confirma un supuesto, `research` actualiza `context/domain/` directamente, porque esa confirmación es justo lo que la investigación aporta y Chris no tiene el conocimiento de dominio para aprobarla; `context/domain` está en el carril `research` desde `7314c71` |
| D4 | Hecho en `7314c71`: Chris declaró `"risk_path_fragments": ["src/engine/", "public/config/"]` |
| D5–D7, D10–D12 | Aprobadas según la recomendación |
| D8 | Aprobada: congelar el plan anterior en `docs/legacy/` |
| D9 | `~/Documents` no se sincroniza; los borradores quedan en `~/Documents/pliegostack/borradores/` |
| D13 | La investigación se hace en Santiago, Chile |

Fuente de prospectos aprobada: el Google Sheet «PliegoStack — imprentas chilenas y referencias (2026-09-23)», <https://docs.google.com/spreadsheets/d/1uecoZsZjp7d3WklkZJJ8a9hsX0_Ghm0bjQ2bCQDzcjI/edit>, con la hoja «Prospectos» (18 imprentas) y la hoja «Referencias» (13 datos técnicos públicos).
El sheet sigue siendo la fuente de contactos: correos y nombres de personas no entran al repo, solo el enlace.

Modelo de orquestación aprobado: un orquestador sin carril hace la migración, abre los dos carriles en paneles de Herdr y después solo coordina (sección 6).

Chris commiteó en `7314c71` `context/domain` en `lanes.research.paths` y los `risk_path_fragments`.
Queda desfasado el comentario de `research` en la política, que sigue diciendo «nada que construccion lea» y deja de ser cierto con D3; lo corrige Chris a mano si quiere.

## Qué cambió desde la primera versión

La primera versión, del 2026-09-26, se escribió con `~/.agents` en `72bee19`.
Esta se escribe con `~/.agents` en `51474ec` y el repo en `16238f7`, donde Chris declaró los carriles.

- **El repo declara dos carriles** en `.agents/policy.json`, y el harness los aplica (`~/.agents/docs/orchestration.md`, «Sessions and lanes»).
  Una sesión lanzada con `sesion --lane <carril> -- <cli>` solo escribe y commitea dentro de las rutas de su carril; sin carril, nada cambia.
  Esto sustituye la recomendación anterior sobre `write_paths` (sección 7).
- **`.verify.conf` tiene `[skip-when-only]`**: un commit cuyas rutas staged calzan todas con `docs/* context/* *.md` no corre `tsc` ni `vitest` en `pre-commit`.
  El fin de turno y `review-gate` siguen corriendo todo.
- **La revisión de push es a demanda y solo espera por lo crítico** (`ce6707f`).
  Con D4, un push que toque `src/engine/` o `public/config/` exige revisión independiente; el resto sale sin ella salvo que alguien la pida.
- **`create-handoff.mjs` se retiró el 2026-09-29** (`9fcfcd7`): el brief vive en el prompt de quien delega y la continuidad en el checkpoint del capitán.
  `docs/handoffs/` queda como registro histórico.
- **El vocabulario de roles vive en `VALID_ROLES` de `run-worker.mjs`**, con los mismos ocho contratos más `worker`.
- **Sale la familia `google`** (`2c22a47`): quedan `anthropic` y `openai`, y `researcher` corre primero con Anthropic.
  Un Reviewer independiente de un Researcher de Anthropic tiene que ser de OpenAI; si OpenAI no tiene cuota, no hay revisor independiente y el flujo espera o pregunta a Chris.
- **La propuesta pasa de seis flujos a dos carriles.**
  Los flujos siguen existiendo como playbooks, pero se agrupan por carril y heredan su territorio.

## Qué se comprobó y cómo

Estado del repo al completar esta versión, con git: `master` sobre `7314c71`, con dos archivos sin seguimiento, este y el handoff del 2026-09-25.

Leído entero o en la parte pertinente:

- En `~/.agents`: `docs/plan-sesiones-carriles-y-verificacion.md` entero, la sección «Sessions and lanes» de `docs/orchestration.md`, `workflows/review-policy.json`, `reviewRisk()` y `loadReviewPolicy()` en `pi-extensions/review/runtime.mjs`, el uso del lanzador `~/.local/bin/sesion`, y el log de `8c39d19` a `51474ec`.
- En el proyecto: `.agents/policy.json`, en `7314c71`, y `.verify.conf`, leídos con la herramienta de lectura y no con la shell; los encabezados de `docs/PLAN.md` y su sección «Decisiones pendientes»; la decisión del 2026-09-24; y las referencias a los cuatro documentos de legado en todo el repo.
- El Google Sheet de prospectos, leído entero el 2026-10-02 con el conector de Google Drive.
- `node ~/.agents/workflows/scripts/session.mjs list --repo .` corre y sale con 0; hoy no lista ninguna sesión.

De la primera versión siguen valiendo, sin releerlos: `playbooks/`, `schemas/`, `patterns/`, `roles/`, `captain-relay.mjs` y `project-policy.mjs` fuera de `lanes`; y lo leído del proyecto (`docs/CONFIG.md`, `src/engine`, `public/config`, `UX-REVIEW.md`, `UI-REDESIGN.md`).

Esta fase solo produce documentación: no se corrió `npm test`, `npm run build` ni el arnés de navegador.
No verifiqué que la prueba real de carriles del plan del harness se haya corrido en este repo.

## Hallazgos que cambian algo

1. **`AGENTS.md` del proyecto manda a un agente nuevo a construir el incremento 5.**
   Su paso 2 dice «implementa solo el incremento que el plan marca como siguiente», y `docs/PLAN.md` sigue diciendo que el siguiente es el 5, que la decisión del 2026-09-24 rechazó.
   El paso 4 y «Al cerrar un incremento», que pide actualizar «Estado actual» de `PLAN.md`, también quedan desfasados.
   Lo resuelve la fase 1 de la migración.
2. **«Dirección» de `docs/PLAN.md` contradice la decisión vigente.**
   Dice que no se planifican entrevistas ni pilotos, por decisión del 2026-09-15; la del 2026-09-24 abre una investigación de mercado.
   Pasa corregida a `context/product/`.
3. **`docs/CONFIG.md` tiene una advertencia desfasada sobre los esquemas de plegado.**
   Dice que la rotación no se ha confirmado contra un pliego doblado, mientras el `source` de `esquemas.json` y R-27 dicen que Chris confirmó el de 16 páginas el 2026-09-23.
4. **Seis comentarios de código citan los documentos que pasan a legado.**
   `src/engine/folding.ts:16` y `e2e/inventory.spec.ts:4` citan `docs/PLAN.md`; `src/store/useBookStore.ts:55` y `:404` y `src/styles/index.css:396` citan `docs/UX-REVIEW.md`; `e2e/layout.spec.ts:4` cita `docs/UI-INVENTORY.md`.
   Son territorio de `build`, que los corrige en su primer commit.
5. **Los pendientes del plan anterior no están en un solo lugar.**
   «Decisiones pendientes» de `PLAN.md` tiene 19 viñetas, pero hay además nueve secciones de cosas abiertas dentro de los incrementos y «Decisiones abiertas» en `UI-REDESIGN.md`.
6. **El sheet de prospectos trae datos de personas en dos columnas, no en una.**
   «Contacto público» tiene correos, y dos de ellos tienen forma de correo personal.
   «Área a entrevistar» nombra a dos personas en una fila; las demás filas nombran un área o un cargo.
   El índice del repo excluye «Contacto público» entero y reduce «Área a entrevistar» al área o cargo, sin nombres.
7. **De las 8 imprentas de prioridad «Alta», una es de Valparaíso.**
   GSR es «Alta» y queda fuera de la ronda de Santiago, así que la primera ronda tiene 7: A Impresores, Ograma Impresores, Andros Impresores, DFG, Donnebaum, Portal Gráfico y Gráfhika Impresores.
   dospuntocero (Valparaíso), Laser Impresores y Allimpresiones (ubicación no verificada) son de prioridad «Media»; quedan en el índice, marcadas fuera de la ronda.
8. **`capitan --playbook` solo encuentra playbooks globales**, y el relevo está congelado hasta el 2026-10-15; un playbook del proyecto se nombra en el objetivo, como en `wiki-ai`.
9. **Dos textos globales se contradicen sobre los schemas**: `playbooks/README.md` dice que la salida se valida; `schemas/README.md` y `orchestration.md` dicen que no.
10. **Ninguna referencia a `docs/CONFIG.md` en código.**

## 1. Inventario: qué capacidad pedida ya existe y dónde

| Capacidad pedida | Existe | Dónde |
|---|---|---|
| Roles base | Sí, ocho | `~/.agents/roles/`, vocabulario en `VALID_ROLES` de `run-worker.mjs` |
| Patrones seleccionables | Sí, diez | `~/.agents/patterns/` |
| Contratos de salida | Sí, cinco, no mecanizados | `~/.agents/schemas/` |
| Enrutamiento rol → familia y modelo | Sí, dos familias | `~/.agents/workflows/routing.json` y `models.json` |
| Playbooks de feature y de bug | Sí | `~/.agents/playbooks/feature-development.md` y `bug-fixing.md` |
| Enrutamiento de contexto por flujo | Sí | Bloque `context_sources` de `playbooks/README.md` |
| Playbooks de proyecto | Sí, como convención | `<repo>/.agents/<nombre>.md`, precedente de `wiki-ai` |
| Contrato de capitán y puerta de aprobación | Sí | `~/.agents/docs/orchestration.md` |
| Rutas protegidas | Sí, aplicadas | `protected_paths` en la política del repo |
| Territorio por carril | Sí, declarado en este repo | `lanes`; herramientas de archivo, sandbox de workers y `pre-commit` |
| Coordinación entre sesiones | Sí | Registro de sesiones, trailers `Agents-Session` y `Agents-Lane`, avisos |
| Presupuesto de sesión | Sí, solo en `build` | `session_budget.max_workers: 25` |
| Puerta de commit | Sí, con alcance por rutas | `pre-commit` y `[skip-when-only]` |
| Puerta de push con revisión independiente | Sí, para `src/engine/` y `public/config/` | `pre-push` y `risk_path_fragments` |
| Handoffs | Retirados el 2026-09-29 | Brief en el prompt; continuidad en el checkpoint del capitán |
| Decisiones y aprendizajes del proyecto | Sí | `record-decision.mjs` y `record-learning.mjs --record-scope project`, en los dos carriles |
| Procedencia de datos | Sí, a nivel de archivo | `source` y `provisional` en seis JSON de `public/config` |
| Procedencia por hallazgo con fecha | No | Se exige dentro del texto de `source` |
| Fuente de prospectos | Sí, fuera del repo | Google Sheet del 2026-09-23 |
| Canal de correo verificado para un agente | No | No se probó ninguno, y el agente no envía nunca |

## 2. Delta mínimo a la capa global

**No hace falta ninguno.**
Los carriles, que eran lo único que la primera versión no podía expresar, ya existen.

## 3. Detalle dentro de `docs/legacy/`, `context/` y `.agents/`

### `docs/legacy/`: el plan anterior congelado

```text
docs/legacy/
├── README.md               # qué es esto, desde cuándo, y que nada aquí es compromiso
├── backlog-heredado.md     # el índice único de lo que quedó abierto
├── PLAN.md                 # docs/PLAN.md, movido con git mv
├── UX-REVIEW.md
├── UI-REDESIGN.md
└── UI-INVENTORY.md
```

- Los cuatro documentos se mueven con `git mv`, sin cambiar su contenido, para conservar el historial y que sus anclas sigan resolviendo dentro de la carpeta.
  Cada uno gana solo una primera línea: «Congelado el AAAA-MM-DD. Es registro, no compromiso; lo vigente está en `docs/PLAN.md`.»
- `backlog-heredado.md` es un índice, no una copia: una línea por pendiente, con enlace a la sección donde está explicado.
  Junta las 19 viñetas de «Decisiones pendientes», las nueve secciones de cosas abiertas y las «Decisiones abiertas» de `UI-REDESIGN.md` (hallazgo 5).
  Los cinco supuestos de imprenta aparecen marcados como tales, con enlace a su concepto en `context/domain/`, que es donde `research` los irá confirmando.
- Ningún carril escribe en `docs/legacy/`.
  Un pendiente sale del legado solo cuando Chris lo promueve al plan nuevo, y el legado no se edita para marcarlo.

### El plan nuevo

`docs/PLAN.md` vuelve a existir, corto, como único compromiso vigente:

- La pausa del 2026-09-24, levantada solo para lo que dicen los carriles.
- Carril `build`: la exportación de la ficha técnica (UX-8), con su objetivo, alcance, no objetivos y criterios de aceptación.
  Lo que UX-8 decía de importar queda en el backlog heredado; D1 solo pide exportar.
- Carril `research`: la ronda de Santiago, con clientes y editoriales, y su criterio de cierre.
- Una sección «Promovido desde el legado o desde research», vacía al nacer, donde Chris trae pendientes con su fecha.
- Punteros a `context/product/product-context.md` y a `docs/legacy/`.

`docs/PLAN.md` está en el carril `build`.
`research` no lo escribe: su puente al plan es una propuesta en `docs/research/` que el orquestador lleva a Chris.

### `context/`

Criterio de corte:

- `domain/` explica el oficio sin nombrar código, campos ni archivos.
- `architecture/` explica cómo lo modela el código y enlaza a `domain/` para el porqué.
- Un número concreto de una imprenta nunca vive en `context/domain/` ni en `context/architecture/`: vive en su JSON cuando pasa por `build`, y mientras tanto en `context/market/` como dato público por confirmar.
- Cada afirmación de `domain/` lleva uno de tres estados: **confirmado** (con qué imprenta y cuándo, nunca con qué persona), **supuesto** o **desconocido**.

```text
context/
├── product/                 # carril build
│   ├── product-context.md   # mapa raíz
│   ├── users.md
│   ├── capabilities.md
│   └── non-goals.md
├── domain/                  # carril research (D3)
│   ├── terminology.md
│   ├── imposition.md
│   ├── signatures.md
│   ├── binding.md
│   ├── cover.md
│   └── paper.md
├── architecture/            # carril build
│   ├── overview.md
│   ├── engines.md
│   ├── config.md            # docs/CONFIG.md, movido con git mv
│   └── state.md
└── market/                  # carril research
    ├── open-questions.md
    ├── printers.md          # índice de imprentas sembrado desde el sheet
    ├── references.md        # datos técnicos públicos por confirmar
    └── customers.md         # clientes y editoriales, nace con el primer hallazgo (D2)
```

| Archivo | Contenido | De dónde sale |
|---|---|---|
| `product/product-context.md` | Mapa raíz: producto, usuarios, problema, capacidades, dominio, arquitectura, principios, no objetivos, invariantes | «Dirección» de `PLAN.md`, corregida |
| `product/users.md` | Hueco declarado: qué se supone del usuario y qué no se sabe | «Dirección» de `PLAN.md`; después, lo que Chris promueva de `market/customers.md` |
| `product/capabilities.md` | Qué hace la app hoy y qué no, en términos de usuario | «Estado actual», comprobado contra `src/engine` |
| `product/non-goals.md` | No objetivos cerrados y preguntas abiertas | Decisiones de `docs/decisions/` |
| `domain/*.md` | El oficio: terminología, imposición, firmas, encuadernación, tapa, papel, con los cinco supuestos marcados | `CONFIG.md`, `UX-REVIEW.md`, comentarios de `src/engine`, R-12 y R-27 |
| `architecture/*.md` | Stack y flujo, los siete motores, la configuración y el store | `src/`, `CONFIG.md`, «Estado actual» |
| `market/open-questions.md` | Las preguntas de mercado abiertas, incluidas las de clientes y editoriales | Handoff del 2026-09-24 |
| `market/printers.md` | Una entrada por imprenta del sheet: prioridad, comuna, perfil, procesos, equipamiento, encuadernación, datos públicos, área a entrevistar sin nombres, hipótesis, pregunta de validación, fuentes, y si está en la ronda de Santiago | Hoja «Prospectos», sin «Contacto público» |
| `market/references.md` | Los 13 datos técnicos públicos, cada uno con su aplicación posible y su límite a confirmar, en estado **por confirmar** | Hoja «Referencias» |

### `.agents/`

```text
.agents/
├── policy.json            # existe, protegida, la edita Chris
├── build-feature.md       # carril build
├── fix-bug.md             # carril build
├── research-market.md     # carril research
├── research-printer.md    # carril research
└── contact-printer.md     # carril research
```

- `build-feature.md` y `fix-bug.md` son instancias con parámetros del playbook global: lo nombran y declaran solo lo propio (`context_sources`, modo, puertas humanas, Node 22.22.2 y arnés de navegador).
- `research-market.md` investiga segmentos: tipos de imprenta, clientes y editoriales, qué usan hoy y dónde encaja la herramienta, en Santiago.
- `research-printer.md` profundiza en una imprenta concreta del índice, hasta un perfil de empresa.
  Si confirma un supuesto, actualiza `context/domain/` directamente (D3); si la imprenta entrega datos reales para un JSON, deja la propuesta en `docs/research/`.
- `contact-printer.md` termina en un borrador en `~/Documents/pliegostack/borradores/`; el contacto se toma del sheet, nunca del repo.
- `analyze-quote.md` no se crea hasta que Chris lo defina (D6).
- `AGENTS.md` y `.agents/` no están en ningún carril: los cambia solo una sesión sin carril.

Forma de un playbook de investigación, con `research-market` como ejemplo:

```yaml
context_sources:
  required:
    - id: product_map
      path: "context/product/product-context.md"
      how: load
      why: "Qué es el producto y qué no, para juzgar si un segmento es candidato."
    - id: market_gaps
      path: "context/market/open-questions.md"
      how: load
      why: "Las preguntas que la investigación tiene que responder."
    - id: printers
      path: "context/market/printers.md"
      how: load
      why: "Las imprentas candidatas, su prioridad y si están en la ronda de Santiago."
    - id: terminology
      path: "context/domain/terminology.md"
      how: load
      why: "El vocabulario del oficio con el que se lee lo que publica una imprenta."
  optional:
    - id: prior_notes
      path: "docs/research/"
      how: search
      why: "Notas fechadas de sesiones anteriores, para no repetir una búsqueda ya hecha."
    - id: references
      path: "context/market/references.md"
      why: "Datos técnicos públicos que una entrevista puede confirmar."

steps:
  - role: Researcher
    patterns: [evidence-gathering, surface-assumptions]
    output: research
    goal: Responder una pregunta de open-questions.md con fuentes públicas; cada hallazgo con status y con source que incluya "consultado AAAA-MM-DD".
  - role: Reviewer
    patterns: [adversarial-review]
    output: review
    goal: Rechazar todo hallazgo sin fuente o sin fecha, toda cifra de mercado sin cita, y todo nombre o correo de una persona.
```

### Especialistas de dominio

Un experto en terminología o un diseñador de imposición son **pasos de playbook con contexto de dominio**, no roles (D5).

## 4. Interfaz entre capas

1. **Global no sabe nada de un proyecto.**
   Lee de un repo solo lo que el repo declara: `AGENTS.md`, el contrato de verificación y la declaración de política, incluidos sus carriles.
2. **Harness de producto lee del global por nombre, no por copia.**
3. **Harness de producto lee de `context/` por ruta, declarada en `context_sources`.**
4. **`context/` no sabe que hay agentes.**
   Ningún archivo de `context/` menciona `.agents/`, `~/.agents`, roles, playbooks, patrones, schemas ni carriles.
5. **Dentro de `context/`, las dependencias van hacia el oficio.**
   `architecture/` enlaza a `domain/`; `domain/` no enlaza a `architecture/` ni nombra código; `product/` enlaza a los dos.
6. **`docs/` apunta a `context/` y no repite su contenido.**
   `docs/legacy/` puede repetirlo, porque es registro.
7. **Ningún dato de una persona entra al repo.**
   Nombres y correos viven en el sheet o en `~/Documents/pliegostack/borradores/`; el repo nombra empresas y áreas.

Las cláusulas 4, 5 y 7 se comprueban con tres búsquedas en cada fase y en cada commit de `research`:

```bash
grep -rniE "\.agents|\bplaybook|\bresearcher\b|\bbuilder\b|\breviewer\b|\bschema|\bcarril|\blane\b" context/ && echo "fuga hacia el harness"
grep -rnE "src/|public/config|\.json|\.ts\b" context/domain/ && echo "domain nombra código"
grep -rnE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" context/ docs/research/ && echo "correo en el repo"
```

La tercera no detecta un nombre de persona; eso lo cubre el paso Reviewer de cada flujo de investigación.

## 5. Plan de migración

### Quién la hace

La migración escribe en los dos carriles y fuera de ambos (`docs/legacy/`, `AGENTS.md`, `.agents/*.md`).
La hace **el orquestador, una sesión sin carril designada por Chris como capitán, en secuencia y antes de abrir los carriles**.
Los carriles se abren cuando la migración está commiteada; el cambio de política de D3 ya lo está.

Siete fases, cada una un commit reversible con `git revert`.
Todas tocan solo Markdown bajo `docs/`, `context/` o con extensión `.md`, así que `[skip-when-only]` salta `tsc` y `vitest` en cada `pre-commit`; ninguna toca código.
Mensajes en inglés con prefijo `docs:`, sin coautores de agentes.

Comprobaciones comunes a cada fase:

- `git status` y `git diff --stat` muestran solo los archivos de la fase.
- Todos los enlaces relativos de los archivos tocados resuelven, con un bucle de shell sobre `grep -o '](\.[^)]*)'` y `test -e`.
- Las tres búsquedas de la sección 4.

| Fase | Qué hace | Carril dueño después | Verificación propia | Rollback |
|---|---|---|---|---|
| 1 | Congelar: `git mv` de `docs/PLAN.md`, `UX-REVIEW.md`, `UI-REDESIGN.md` y `UI-INVENTORY.md` a `docs/legacy/`, con su línea de congelado; `docs/legacy/README.md`; reescribir «Por dónde empezar» y «Al cerrar un incremento» de `AGENTS.md` | Ninguno | `git log --follow` conserva el historial de los cuatro; `grep -n "incremento que el plan marca" AGENTS.md` sale vacío | `git revert` |
| 2 | `docs/legacy/backlog-heredado.md` | Ninguno | Cada viñeta y cada sección de cosas abiertas del hallazgo 5 aparece exactamente una vez, con enlace que resuelve | `git revert` |
| 3 | `git mv docs/CONFIG.md context/architecture/config.md`; `overview.md`, `engines.md` y `state.md`; corregir la advertencia de esquemas | `build` | Cada afirmación comprobada contra `src/`; `config.md` sigue listando los campos que valida `validateCatalog.ts` | `git revert` |
| 4 | Escribir la primera versión de `context/domain/`, con los cinco supuestos marcados como **supuesto** y ninguno como confirmado | `research` | Cada supuesto aparece una vez en `domain/` y una en el backlog, enlazados; la búsqueda de código sale vacía; ninguna afirmación dice «confirmado» salvo el doblez de 16 páginas del 2026-09-23 | `git revert` |
| 5 | `context/product/` y `context/market/open-questions.md`, con las preguntas de clientes y editoriales | `build` y `research` | `users.md` y `open-questions.md` no tienen ninguna cifra ni nombre de imprenta; las viñetas de «Estado actual» tienen casa nueva | `git revert` |
| 6 | El `docs/PLAN.md` nuevo, con UX-8 para `build` y la ronda de Santiago para `research` | `build` | Cabe en unas 80 líneas; no describe motores ni pantalla; enlaza a `context/` y a `docs/legacy/` | `git revert` |
| 7 | Los cinco playbooks de `.agents/`; el ADR con `record-decision.mjs --record-scope project` | Ninguno | Cada rol está en `VALID_ROLES`, cada patrón y schema existe, cada ruta que un playbook escribe está en su carril | `git revert` |

La fase 4 la escribe el orquestador porque el carril `research` todavía no existe; desde que se abre, `context/domain/` es de `research`.
Ese primer texto no confirma nada que no estuviera confirmado: solo traslada lo que el repo ya sabe, con su estado.

**Sembrar `context/market/` desde el sheet es la primera tarea de `research`, no una fase de la migración.**
La migración solo reorganiza lo que el repo ya sabe; el sheet es una fuente nueva, y decidir qué columna entra y cuál no (hallazgo 6) es trabajo de investigación con revisión.
Además, ese primer commit es la prueba real del carril: un commit de solo Markdown con `Agents-Lane: research` que salta los checks.

Fuera de las siete fases:

- Los seis comentarios de código del hallazgo 4 los corrige `build` en su primer commit.
- Nada se empuja: Chris empuja a mano.
  Ninguna fase toca `src/engine/` ni `public/config/`, así que `pre-push` no pedirá revisión de la migración; si Chris la quiere, el orquestador la lanza con `review-gate.mjs review`.

## 6. Los dos carriles

Territorio, con las rutas que declara `.agents/policy.json` en `7314c71`:

| | `research` | `build` |
|---|---|---|
| Escribe | `docs/research`, `context/market`, `context/domain`, `docs/decisions`, `docs/learnings` | `src`, `e2e`, `public`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `context/architecture`, `context/product`, `docs/PLAN.md`, `docs/decisions`, `docs/learnings` |
| Lee | `context/`, `docs/legacy`, la app publicada, el sheet | `context/`, `docs/legacy`, `docs/research` solo cuando Chris promueve algo |
| Playbooks | `research-market`, `research-printer`, `contact-printer` | `build-feature`, `fix-bug` |
| CLI del capitán | Claude | Codex |
| Dónde trabaja | Checkout principal, commits de Markdown en `master` | Worktrees e `integrate/<sesión>`; Chris integra a `master` |
| Verificación de commit | `[skip-when-only]` salta `tsc` y `vitest` | Contrato completo; revisión en `pre-push` si toca `src/engine/` o `public/config/` |
| Presupuesto | Ninguno declarado | `max_workers: 25` |

### Qué comparten, y por qué siguen siendo independientes

- **Escritura disjunta.**
  Las únicas rutas compartidas son `docs/decisions` y `docs/learnings`, donde cada registro es un archivo nuevo con fecha y título.
- **`research` escribe una cosa que `build` lee: `context/domain/`.**
  Es documentación del oficio, no compromiso ni datos.
  Que `research` marque un supuesto como confirmado no cambia ningún cálculo: los motores leen los JSON de `public/config/`, que solo escribe `build`.
  Llevar un supuesto confirmado a `src/` o a `public/config/` sigue el camino de siempre: `research` deja la propuesta en `docs/research/`, con el supuesto, la imprenta y la fecha, y los JSON afectados; el orquestador la lleva a Chris; Chris la pasa a `docs/PLAN.md`; y `build` la implementa con `build-feature`, que exige revisión en el push por D4.
  Entre la confirmación y ese cambio, `domain/` dice «confirmado» y el JSON sigue `provisional: true`; esa diferencia es la señal de que hay una propuesta pendiente, no un error.
- **`build` no depende de `research` para trabajar.**
  UX-8 no necesita ninguna respuesta de una imprenta, y lo que `build` lee de `domain/` es contexto, no especificación.
- **`research` no depende de `build`.**
  Lee `context/product/` para saber qué hace la app; la ficha exportable le sirve en las entrevistas cuando exista, pero no la espera.

### Rutas que no calzan con la política, o que piden un cambio de Chris

1. **`context/domain/`**: está en `lanes.research.paths` desde `7314c71`.
   El comentario de `research` en la política sigue diciendo «nada que construccion lea»; es el único desfase que queda, y lo corrige Chris.
2. **`context/product/` está entero en `build`.**
   No cambia: por D2, los hallazgos de clientes y editoriales viven en `context/market/customers.md` y Chris los promueve a `users.md`; la promoción la escribe una sesión de `build` o sin carril.
3. **`AGENTS.md`, `.agents/*.md`, `docs/legacy/` y `docs/handoffs/` no están en ningún carril.**
   Es lo que se quiere: solo una sesión sin carril los cambia.
4. **`research` no tiene `session_budget`.**
   Si se quiere que no se coma la cuota de `build`, el orquestador lo lanza con `--max-workers`, que solo puede bajar el presupuesto, o Chris lo declara en la política.

### Cómo corren a la vez

Modelo aprobado por Chris:

1. **El orquestador**, una sesión sin carril que Chris designa como capitán, hace la migración de la sección 5.
2. Abre dos paneles de Herdr: uno con `sesion --lane research -- claude` y otro con `sesion --lane build -- codex`, cada uno con su brief de arranque (abajo).
   El de `build` se abre con su cwd en un worktree de `integrate/<sesión>`, no en el checkout principal, para que el `HEAD` de `master`, que mueve `research`, no se mueva bajo `build`.
3. **La primera vez, verifica que los dos quedaron registrados con su carril**, porque lanzar `sesion` dentro de un panel de Herdr abierto por un capitán no está probado:
   ```sh
   node ~/.agents/workflows/scripts/session.mjs list --repo .
   ```
   Tienen que aparecer dos sesiones activas, una con carril `research` y otra con carril `build`.
   Si falta una, o aparece sin carril, el orquestador cierra ese panel y avisa a Chris en vez de seguir: un carril que no quedó registrado no restringe nada.
   Después del primer commit de cada carril, comprueba con `git log -1 --format=%B` que lleva los trailers `Agents-Session` y `Agents-Lane`.
4. **Después no implementa.**
   Coordina: lee lo que cada carril commitea, verifica contra git, y trae a Chris las propuestas de `research` en `docs/research/` para que él decida qué pasa a `docs/PLAN.md`.
5. Cada carril es su propia sesión, con su capitán, su presupuesto y sus workers; el orquestador no les delega trabajo dentro de su carril.

| Par | ¿A la vez? | Estado compartido | Dónde se integran |
|---|---|---|---|
| `build-feature` + `fix-bug` | Sí, en worktrees separados | `src/` | `integrate/<sesión>`, del carril `build` |
| Cualquier flujo de `build` + cualquiera de `research` | Sí | `build` lee `context/domain/`, que escribe `research` | En `docs/PLAN.md`, por Chris |
| `research-market` + `research-printer` | Solo si escriben archivos distintos de `context/market/` | `context/market/` | Secuencialmente, dentro del carril |
| `research-market` → `contact-printer` | No, secuencial | La imprenta objetivo sale de la investigación | La nota de evento en `docs/research/` |
| `contact-printer` → `research-printer` | No, secuencial | Lo que responda la imprenta | `context/market/`, `context/domain/` y, si hay datos para un JSON, una propuesta en `docs/research/` |

Tres cosas sin verificar, que el orquestador comprueba al abrir los carriles:

- Que `sesion` dentro de un panel de Herdr registra la sesión con su carril (paso 3).
- Que un worker `researcher` lanzado con `run-worker.mjs` tiene red dentro de su sandbox; si no la tiene, la búsqueda web la hace el capitán del carril.
- Que en Codex el carril se aplica a las herramientas de archivo y al commit; según el plan del harness, no entra en el sandbox de sus workers.

### Brief de arranque del carril `research`

```text
Eres el capitán del carril research de PliegoStack, en ~/Projects/book-engineering-tool.
Corres bajo `sesion --lane research`: solo puedes escribir y commitear en docs/research,
context/market, context/domain, docs/decisions y docs/learnings.

Lee primero: AGENTS.md, docs/PLAN.md (sección del carril research),
context/product/product-context.md, context/market/open-questions.md,
context/domain/terminology.md y .agents/research-market.md.

Objetivo: entender a qué imprentas, clientes y editoriales de Santiago de Chile les sirve
PliegoStack, y confirmar o refutar los supuestos de context/domain/.

Primera tarea: sembrar context/market/ desde el Google Sheet
"PliegoStack — imprentas chilenas y referencias (2026-09-23)",
https://docs.google.com/spreadsheets/d/1uecoZsZjp7d3WklkZJJ8a9hsX0_Ghm0bjQ2bCQDzcjI/edit
- printers.md: una entrada por cada una de las 18 imprentas de la hoja Prospectos, con
  prioridad, comuna, perfil, procesos, equipamiento, encuadernación, datos públicos,
  área a entrevistar, hipótesis, pregunta de validación y fuentes.
  No copies la columna "Contacto público". De "Área a entrevistar" copia solo el área o el
  cargo, nunca el nombre de una persona. El enlace al sheet es la única vía a los contactos.
- Marca dentro o fuera de la ronda de Santiago. Fuera, sin borrarlas: GSR y dospuntocero
  (región de Valparaíso), Laser Impresores y Allimpresiones (ubicación no verificada).
- references.md: los 13 datos de la hoja Referencias, cada uno con su aplicación posible,
  su límite a confirmar y el estado "por confirmar".
- Un solo commit `docs:` con esto. Comprueba antes que
  `grep -rnE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" context/ docs/research/` sale vacío.

Después, en orden de prioridad del sheet: primero las 7 imprentas "Alta" de Santiago
(A Impresores, Ograma Impresores, Andros Impresores, DFG, Donnebaum, Portal Gráfico,
Gráfhika Impresores), luego las "Media" de Santiago, luego las "Exploratoria".
Clientes y editoriales van en este mismo carril, con hallazgos en context/market/customers.md.

Reglas:
- Cada hallazgo con fuente y "consultado AAAA-MM-DD". Las notas de cada sesión, fechadas,
  en docs/research/. Lo que se concluye va a context/market/.
- Si una imprenta confirma un supuesto, actualiza context/domain/ directamente: estado
  "confirmado", con qué imprenta y cuándo, nunca con qué persona.
- Si eso, o un dato de una imprenta, debería cambiar el código o un JSON de public/config,
  no lo intentes: escribe una propuesta en docs/research/ con el supuesto, la imprenta, la
  fecha y los archivos afectados, y avisa al orquestador.
- Nunca contactes a nadie. Los borradores de contacto van a ~/Documents/pliegostack/borradores/,
  con el contacto tomado del sheet; en el repo solo entra el evento, a nivel de empresa.
- Ningún nombre ni correo de una persona entra al repo.
- El revisor de cada hallazgo es de la otra familia de modelos; si no hay cuota, espera.
- Commits en inglés con prefijo `docs:`. No empujes.

Detente y avisa al orquestador: cuando tengas una propuesta para el plan, antes de cualquier
borrador de contacto, y si un commit es rechazado por el carril.
```

### Brief de arranque del carril `build`

```text
Eres el capitán del carril build de PliegoStack, en un worktree de integrate/<sesión>
de ~/Projects/book-engineering-tool.
Corres bajo `sesion --lane build`: solo puedes escribir y commitear en src, e2e, public,
index.html, los archivos de configuración del proyecto, context/architecture,
context/product, docs/PLAN.md, docs/decisions y docs/learnings.

Lee primero: AGENTS.md, docs/PLAN.md (sección del carril build), context/architecture/,
context/product/capabilities.md, la sección UX-8 de docs/legacy/UX-REVIEW.md y
.agents/build-feature.md.

Primer commit: corregir las seis referencias a documentos que pasaron a docs/legacy/:
src/engine/folding.ts:16, e2e/inventory.spec.ts:4, src/store/useBookStore.ts:55 y :404,
src/styles/index.css:396 y e2e/layout.spec.ts:4. Solo el comentario, nada más.

Objetivo: la exportación de la ficha técnica (UX-8), con el alcance, los no objetivos y los
criterios de aceptación de docs/PLAN.md. Importar no entra.

Reglas:
- Sigue .agents/build-feature.md. Propón el plan del incremento y espera la aprobación
  del orquestador antes de construir.
- Node 22.22.2 (.nvmrc). Tests de motor, store e interfaz; `npm test`, `npm run build` y,
  si hay cambio visible, `npm run test:browser` y una revisión en navegador real sobre
  `npm run preview`.
- Un commit reversible por incremento, en inglés con prefijo convencional.
  Integra en integrate/<sesión>; Chris integra a master.
- context/domain/ lo escribe research; léelo, no lo edites. Si algo de domain debería
  cambiar el código, no lo hagas por tu cuenta: tiene que venir en docs/PLAN.md.
- Un cambio en src/engine/ o public/config/ exige revisión independiente antes del push,
  con `review-gate.mjs review --implementer codex`. No empujes: Chris aprueba el push.
- Sin dependencias nuevas sin aprobación de Chris.

Detente y avisa al orquestador: con el plan del incremento, cuando el incremento esté
verificado, y si un commit es rechazado por el carril.
```

## 7. Permisos, capabilities y humano en el bucle

- **Carriles en vez de `write_paths`.**
  El territorio se aplica antes de escribir (herramientas de archivo y sandbox de workers) y en el commit (`pre-commit` niega cualquier ruta staged fuera del carril).
  Un carril solo estrecha: se intersecta con el `write_paths` del rol, y `protected_paths` siempre gana.
- **Límites declarados por el harness, que esta propuesta acepta:**
  el shell interactivo no se encierra por carril y lo que escribe fuera se detiene en el commit; `--no-verify` y `env -u AGENTS_LANE` saltan el respaldo, así que esto protege contra errores y no contra un agente adversario; en Codex, el carril no entra en el sandbox de sus workers.
- **Rutas protegidas.** Las dos que declara el repo siguen igual.
- **`pre-push`.** Exige revisión independiente si el push toca `src/engine/` o `public/config/` (D4), y lista los commits del rango que son de otra sesión, sin bloquear.
- **Aprobaciones.** Esta propuesta está aprobada; los carriles no se abren antes de que la migración esté commiteada; `build` espera aprobación antes de construir cada incremento; Chris aprueba cada push y cada promoción al plan.
- **Datos de personas.** No entran al repo: el sheet es la fuente de contactos, y los borradores viven en `~/Documents/pliegostack/borradores/`, que no se sincroniza.
  El agente no envía nunca; Chris revisa, edita y envía.

## 8. Handoffs y schemas

- No hay handoffs: los briefs de arranque de la sección 6 van en el prompt de cada panel, y un flujo largo guarda su estado en el checkpoint de su capitán.
- Cada paso pide los campos de su schema (`research`: `question`, `findings` con `statement`, `status` y `source`, `confidence`), en Markdown.
- La procedencia la comprueba el paso Reviewer de cada flujo de investigación; Chris interviene en lo que pasa al plan, no en lo que pasa a `context/domain/`.
- No hay schema nuevo: la fecha se exige dentro de `source`.

## 9. Decisiones

Todas resueltas por Chris el 2026-10-02.

- **D1 — Qué construye `build`**: la exportación de la ficha técnica (UX-8); importar queda en el backlog heredado.
- **D2 — Clientes y editoriales**: en `research`, con hallazgos en `context/market/customers.md` que Chris promueve a `context/product/users.md`.
- **D3 — `context/domain/`**: lo escribe `research` directamente cuando confirma un supuesto; la ruta está en el carril desde `7314c71`.
  Llevar la confirmación a `src/` o `public/config/` pasa por el plan y por `build`.
- **D4 — Rutas críticas**: `src/engine/` y `public/config/`, declaradas en `7314c71`.
- **D5 — Especialistas de dominio**: pasos de playbook con contexto de dominio, sin roles nuevos ni skills.
- **D6 — `analyze-quote`**: sin diseñar; una cotización real vive fuera del repo.
- **D7 — `research-market` y `research-printer`**: el primero a nivel de segmento; el segundo, una imprenta concreta del índice.
- **D8 — Plan anterior**: se congela en `docs/legacy/` con su backlog heredado, y se abre un `docs/PLAN.md` nuevo.
- **D9 — Borradores de contacto**: `~/Documents/pliegostack/borradores/`.
- **D10 — `build-feature` y `fix-bug`**: dos archivos finos que nombran el playbook global.
- **D11 — `docs/research/`**: la crea el primer commit de `research` que escriba una nota.
- **D12 — Delta global**: ninguno.
- **D13 — Geografía**: Santiago, Chile.

## 10. Descartado, con su razón

- **Dejar `docs/PLAN.md` vivo con punteros**: mantiene el incremento 5 como compromiso, contra la decisión de pausa.
- **Copiar los pendientes al plan nuevo**: quedan en el backlog heredado hasta que Chris promueva uno.
- **Borrar los documentos de legado**: son la procedencia de seis comentarios de código y de casi todo `context/`.
- **Que Chris apruebe cada cambio a `context/domain/`**: la confirmación de un supuesto es lo que la investigación aporta, y Chris no tiene el conocimiento de dominio para juzgarla (D3).
- **Sembrar `context/market/` en la migración**: es una fuente nueva, no una reorganización de lo que el repo sabe.
- **Copiar el sheet entero al repo**: traería correos y nombres de personas.
- **Seis flujos al mismo nivel**: se agrupan en dos carriles, que es la unidad que el harness aplica.
- **Declarar `write_paths` por rol**: no expresa territorio por carril.
- **Hacer la migración desde un carril**: escribe en los dos y fuera de ambos.
- **Que el orquestador implemente dentro de un carril**: cada carril tiene su propio capitán.
- **Mover `docs/UI-INVENTORY.md` a `context/`**: es una medición del 2026-09-19.
- **Roles globales nuevos para especialistas**: meten dominio en la capa global (D5).
- **Un schema nuevo para hallazgos con procedencia**: nadie lo leería.
