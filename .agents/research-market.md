# Playbook de proyecto: research-market

Carril: `research`.
Investiga segmentos, no una imprenta concreta: tipos de imprenta, clientes y editoriales de Santiago de Chile, con qué resuelven hoy lo que PliegoStack calcula, y dónde la herramienta encaja y dónde no.
Para una imprenta del índice, `research-printer.md`.
Se nombra en el objetivo de la sesión, porque `capitan --playbook` solo encuentra playbooks globales.

## Contexto

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
      why: "Las imprentas candidatas, su prioridad y si están en la ronda de Santiago. Lo siembra la primera tarea del carril; hasta entonces no existe y se trata como ausente, no como error."
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
```

## Pasos

```yaml
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

## Reglas propias

- **Dónde escribe**: `docs/research` (la nota fechada de la sesión), `context/market` (lo que se concluye), `context/domain`, `docs/decisions` y `docs/learnings`.
  Nunca `src/`, `public/config/` ni `docs/PLAN.md`.
- **Procedencia.**
  Cada hallazgo lleva uno de los tres estados del schema `research` (`verified`, `inference`, `unknown`) y su fuente con la fecha de consulta.
  Lo que no tiene fuente se declara supuesto, no dato.
- **Un hallazgo de mercado no es un cambio de producto.**
  Si de la investigación sale algo para el plan, se escribe como propuesta en `docs/research/` y el orquestador la lleva a Chris.
- **Nada de personas en el repo**: ni nombres, ni correos, ni teléfonos.
  Datos de empresa sí: tamaño, máquinas, catálogo, comuna.
- **Verifica antes de dar un commit por bueno**:
  ```bash
  grep -rniE "\.agents|\bplaybook|\bresearcher\b|\bbuilder\b|\breviewer\b|\bschema|\bcarril|\blane\b" context/ && echo "fuga hacia el harness"
  grep -rnE "src/|public/config|\.json|\.ts\b" context/domain/ && echo "domain nombra código"
  grep -rnE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" context/ docs/research/ && echo "correo en el repo"
  ```
  Las tres tienen que salir vacías.
  Un nombre de persona no lo detecta ninguna: lo cubre el paso Reviewer.
- **El revisor es de la otra familia de modelos que el investigador.**
  Si esa familia no tiene cuota, no hay revisor independiente: el flujo espera o pregunta a Chris.
- Commits en inglés con prefijo `docs:`.
  No se empuja.
