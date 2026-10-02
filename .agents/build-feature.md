# Playbook de proyecto: build-feature

Carril: `build`.
Instancia con parámetros del playbook global `feature-development`: la receta, sus pasos y sus patrones son los de `~/.agents/playbooks/feature-development.md`, y aquí se declara solo lo que es propio de PliegoStack.
Se nombra en el objetivo de la sesión, porque `capitan --playbook` solo encuentra playbooks globales.

Úsalo para construir un incremento que `docs/PLAN.md` asigna al frente `build`.
Un bug que ya existe va por `fix-bug.md`.

## Contexto

```yaml
context_sources:
  required:
    - id: plan
      path: "docs/PLAN.md"
      how: load
      why: "El incremento que toca, su alcance, sus no objetivos y sus criterios de aceptación: es el único compromiso vigente."
    - id: capabilities
      path: "context/product/capabilities.md"
      how: load
      why: "Qué hace la herramienta hoy y qué no, en términos de usuario."
    - id: architecture
      path: "context/architecture/overview.md"
      how: load
      why: "Las capas, el arranque y el mapa de src/."
    - id: engines
      path: "context/architecture/engines.md"
      how: load
      why: "Qué calcula cada motor, para no duplicar un cálculo ni romper la cadena."
    - id: state
      path: "context/architecture/state.md"
      how: load
      why: "Cómo se recalcula el store y cómo se guarda la capa de usuario."
  optional:
    - id: config
      path: "context/architecture/config.md"
      how: load
      why: "Obligatorio si el incremento toca un archivo de public/config/: campos, unidades y reglas de validación."
    - id: domain
      path: "context/domain/"
      how: search
      why: "El porqué del oficio y el estado de cada afirmación. Se lee, no se edita: lo escribe el frente research."
    - id: legacy
      path: "docs/legacy/"
      how: search
      why: "La procedencia de una decisión anterior. Es registro, no compromiso."
```

## Pasos

Los de `feature-development`, con estos ajustes:

```yaml
steps:
  - role: Researcher
    patterns: [surface-assumptions, specification]
    output: research
    goal: Colapsar en una nota corta. Releer el incremento del plan y listar lo que habría que decidir antes de construir; no re-investigar lo que `context/` ya explica.

  - role: Architect
    patterns: [specification, generate-alternatives, decision-matrix]
    output: architecture-decision
    goal: Omitir salvo que el incremento tenga una elección de diseño real. Decide solo lo que consume este incremento.

  - role: Builder
    patterns: [plan-and-execute, validation]
    output: implementation
    goal: Proponer el plan del incremento y esperar la aprobación del orquestador antes de construir. Después, rebanadas pequeñas y verificables, cada una validada antes de seguir.

  - role: Reviewer
    patterns: [adversarial-review, validation]
    output: review
    goal: Obligatorio si el cambio toca src/engine/ o public/config/. Revisor de otra familia que el implementador.

  - role: Documenter
    patterns: [specification]
    output: decision/learning record
    goal: Registrar con `record-decision.mjs` y `record-learning.mjs --record-scope project` solo lo que perdure.
```

## Reglas propias

- **Dónde escribe**: `src`, `e2e`, `public`, `index.html`, los archivos de configuración del proyecto, `context/architecture`, `context/product`, `docs/PLAN.md`, `docs/decisions` y `docs/learnings`.
  Nada más: `context/domain/` lo escribe `research`, y `AGENTS.md` y `.agents/` solo una sesión sin carril.
- **Dónde trabaja**: en un worktree de `integrate/<sesión>`, no en el checkout principal, para que el `HEAD` de `master`, que mueve `research`, no se mueva bajo `build`.
  Chris integra a `master`.
- **Node 22.22.2**, fijado en `.nvmrc`.
  Si `node -v` muestra otra versión, antepón `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"` a cada comando.
- **Verificación**: `npm test`, `npm run build` y, si hay cambio visible, `npm run test:browser` y una revisión a mano en un navegador real sobre `npm run preview`.
  Las afirmaciones sobre lo que la página mide van en `e2e/`, no en Vitest: jsdom no maqueta.
- **Un commit reversible por incremento**, con tests de motor, store e interfaz, en inglés y con prefijo convencional.
- **Sin dependencias nuevas** sin la aprobación de Chris.
- **Revisión de push**: un cambio en `src/engine/` o `public/config/` exige revisión independiente antes del push, con `review-gate.mjs review --implementer <cli>`.
  Chris aprueba el push; nadie más lo hace.

## Puertas humanas

- Antes de construir: Chris aprueba el plan del incremento.
- Antes de empujar: Chris aprueba el push.
- Un supuesto que el incremento deja por confirmar con una imprenta se dice en el reporte, para que Chris lo lleve a `research`.
