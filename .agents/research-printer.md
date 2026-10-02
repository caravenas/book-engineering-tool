# Playbook de proyecto: research-printer

Carril: `research`.
Profundiza en una imprenta concreta del índice `context/market/printers.md`, hasta un perfil de empresa.
Para segmentos, `research-market.md`.
Se nombra en el objetivo de la sesión, porque `capitan --playbook` solo encuentra playbooks globales.

## Contexto

```yaml
context_sources:
  required:
    - id: product_map
      path: "context/product/product-context.md"
      how: load
      why: "Qué es el producto y qué no, para juzgar dónde encaja esta imprenta."
    - id: printer_entry
      path: "context/market/printers.md"
      how: search
      why: "La entrada de la imprenta elegida: perfil, procesos, hipótesis y pregunta de validación. Solo esa entrada."
    - id: terminology
      path: "context/domain/terminology.md"
      how: load
      why: "El vocabulario del oficio con el que se lee lo que publica la imprenta."
    - id: domain
      path: "context/domain/"
      how: search
      why: "Los supuestos que esta imprenta podría confirmar o refutar, con su estado actual."
  optional:
    - id: market_gaps
      path: "context/market/open-questions.md"
      how: load
      why: "Qué preguntas abiertas puede responder esta imprenta."
    - id: references
      path: "context/market/references.md"
      how: search
      why: "Los datos técnicos públicos que esta imprenta puede confirmar."
    - id: prior_notes
      path: "docs/research/"
      how: search
      why: "Notas fechadas de sesiones anteriores sobre esta imprenta."
```

## Pasos

```yaml
steps:
  - role: Researcher
    patterns: [evidence-gathering, surface-assumptions]
    output: research
    goal: Armar el perfil de una imprenta con fuentes públicas y, si la hay, su respuesta a una pregunta; cada hallazgo con status y con source que incluya "consultado AAAA-MM-DD".

  - role: Reviewer
    patterns: [adversarial-review]
    output: review
    goal: Rechazar todo hallazgo sin fuente o sin fecha, todo supuesto marcado como confirmado sin imprenta y fecha, y todo nombre o correo de una persona.
```

## Reglas propias

- **Dónde escribe**: `docs/research` (la nota fechada), `context/market` (el perfil en `printers.md`), `context/domain` (solo para confirmar o refutar un supuesto), `docs/decisions` y `docs/learnings`.
  Nunca `src/`, `public/config/` ni `docs/PLAN.md`.
- **Si la imprenta confirma un supuesto, se actualiza `context/domain/` directamente**: el estado de esa línea pasa a **[confirmado AAAA-MM-DD]** con el nombre de la imprenta y la fecha.
  Nunca con el nombre de una persona.
  Es lo que la investigación aporta, y el revisor lo comprueba antes del commit.
- **Si la imprenta entrega datos reales para un archivo de `public/config/`, no se llevan al archivo.**
  Se escribe una propuesta en `docs/research/` con el supuesto, la imprenta, la fecha y los archivos afectados, y se avisa al orquestador.
  Mientras tanto `context/domain/` dice «confirmado» y el archivo sigue `provisional: true`: esa diferencia es la señal de que hay una propuesta pendiente, no un error.
- **Un número concreto de una imprenta no vive en `context/domain/`**: vive en `context/market/` como dato por confirmar, hasta que pase por el plan.
- **Nada de personas en el repo.**
  Del área a entrevistar se anota el área o el cargo, nunca el nombre.
- Las tres búsquedas de `research-market.md` salen vacías antes de cada commit.
- El revisor es de la otra familia de modelos que el investigador; si no hay cuota, el flujo espera o pregunta a Chris.
- Commits en inglés con prefijo `docs:`.
  No se empuja.
