# Playbook de proyecto: contact-printer

Carril: `research`.
Termina en un borrador de contacto para una imprenta, en `~/Documents/pliegostack/borradores/`.
**El agente nunca envía nada.**
Chris revisa, edita y envía.
Se nombra en el objetivo de la sesión, porque `capitan --playbook` solo encuentra playbooks globales.

## Contexto

```yaml
context_sources:
  required:
    - id: printer_entry
      path: "context/market/printers.md"
      how: search
      why: "La entrada de la imprenta elegida: su área a entrevistar, su hipótesis y su pregunta de validación. Solo esa entrada."
    - id: market_gaps
      path: "context/market/open-questions.md"
      how: load
      why: "Qué preguntas conviene hacerle a esta imprenta, y los cinco supuestos del oficio."
    - id: product_map
      path: "context/product/product-context.md"
      how: load
      why: "Qué es PliegoStack y qué no, para no prometer lo que la herramienta no hace."
  optional:
    - id: prior_notes
      path: "docs/research/"
      how: search
      why: "Si ya hubo contacto con esta imprenta y qué se le preguntó."
    - id: domain
      path: "context/domain/"
      how: search
      why: "El estado de los supuestos que el borrador quiere confirmar."
```

La persona de contacto sale de la hoja de prospectos, que es la fuente de contactos: <https://docs.google.com/spreadsheets/d/1uecoZsZjp7d3WklkZJJ8a9hsX0_Ghm0bjQ2bCQDzcjI/edit>.
Un correo o un nombre de persona nunca entra al repositorio.

## Pasos

```yaml
steps:
  - role: Researcher
    patterns: [evidence-gathering, surface-assumptions]
    output: research
    goal: Elegir, para esta imprenta, las pocas preguntas que más reducen incertidumbre, con el supuesto de context/domain/ al que responde cada una.

  - role: Reviewer
    patterns: [adversarial-review]
    output: review
    goal: Rechazar el borrador si promete algo que la herramienta no hace, si presenta un dato de ejemplo como real, si pide un dato que no hace falta, o si trae un dato de una persona que no está en el borrador por necesidad.
```

El borrador lo escribe el capitán del carril, no un worker: ni `Researcher` ni `Reviewer` escriben archivos.

## Reglas propias

- **Dónde escribe**: el borrador, en `~/Documents/pliegostack/borradores/`, fuera del repositorio y sin sincronizar; y, en el repo, `docs/research` (la nota del evento).
- **Qué entra al repo**: solo el evento a nivel de empresa, por ejemplo «borrador preparado para la imprenta X, AAAA-MM-DD».
  Que Chris lo envió, y la respuesta, se anotan cuando Chris lo dice.
- **Antes de cualquier borrador, el capitán se detiene y avisa al orquestador**, que lo lleva a Chris.
- El borrador pide lo mínimo y es honesto sobre el estado del producto: una herramienta sin usuarios, con datos de ejemplo, que busca confirmar cómo trabaja una imprenta.
- La respuesta de la imprenta, cuando llega, abre una sesión de `research-printer.md`.
- Commits del evento en inglés con prefijo `docs:`.
  No se empuja.
