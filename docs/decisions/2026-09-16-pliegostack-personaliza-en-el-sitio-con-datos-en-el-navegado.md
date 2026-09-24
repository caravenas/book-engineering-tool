---
type: "decision"
date: 2026-09-16
status: "accepted"
reversibility: "moderate"
confidence: "medium"
curated: 2026-09-17
---

# Decision: PliegoStack personaliza en el sitio con datos en el navegador y backend en una segunda etapa

## Decision

Antes del incremento 4 se hace un pase de diseno de experiencia, conservando el lenguaje visual actual.

La configuracion podra editarse desde el sitio y debe servir tanto a una imprenta que carga sus datos una vez como a un editor que los cambia a diario.

En el MVP esos datos viven en el navegador; una segunda etapa incorpora un backend simple para usuarios y sus configuraciones.

## Rationale

La app crecio por acumulacion y el incremento 4 anade otro panel denso, asi que reordenar ahora cuesta menos que despues.

Chris prioriza la experiencia sobre la persistencia en esta etapa, y acepta el limite del almacenamiento local.

## Alternatives considered

- Mantener solo archivos de configuracion (descartado: deja fuera al usuario que cambia datos a diario).
- Esperar al backend antes de permitir edicion en el sitio (descartado: retrasa la experiencia sin necesidad en un MVP).

## Evidence

- Verificado en navegador: densidad y scroll, tres acepciones de hojas en una pantalla, notas de fuente repetidas, y solo 2 de 6 catalogos editables desde la UI.

## Follow-ups

- El diseno debe mantener frontera clara entre defaults entregados y overrides del usuario, y una via de export/import para que los datos salgan del navegador.
- Revisar la especificacion con Chris antes de implementar.

Curated: 2026-09-17 — kept as history, not promoted: project fact already in book-engineering-tool docs/UX-REVIEW.md
