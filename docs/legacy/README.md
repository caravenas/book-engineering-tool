# Legado: el plan anterior de PliegoStack

Esta carpeta guarda el plan que gobernó el proyecto hasta la pausa del 2026-09-24.
Se congeló el 2026-10-02, cuando Chris aprobó la propuesta de tres capas (`docs/2026-09-26-propuesta-tres-capas.md`, decisión D8).

**Nada de lo que hay aquí es compromiso.**
Es registro: explica por qué el código y los datos son como son, y de dónde sale casi todo lo que está en `context/`.

## Qué hay

- `PLAN.md`: el plan canónico anterior, con los incrementos 1 a 4 y el rediseño R-1 a R-31.
- `UX-REVIEW.md`: la revisión de UX aprobada el 2026-09-16.
  Su incremento UX-8, exportar la ficha técnica, es lo que construye el carril `build` según el plan vigente; importar no entra.
- `UI-REDESIGN.md`: el rediseño de la interfaz aprobado el 2026-09-19.
- `UI-INVENTORY.md`: una medición de la interfaz del 2026-09-19, que no se actualiza.
- `backlog-heredado.md`: el índice único de lo que el plan anterior dejó abierto, con enlace a la sección donde cada pendiente está explicado.

## Reglas

- El plan vigente es `docs/PLAN.md`.
  Si algo de aquí contradice a ese plan o a `context/`, manda el plan vigente.
- Los cuatro documentos movidos conservan su contenido: solo ganaron la primera línea que dice que están congelados.
  Sus menciones a `docs/PLAN.md`, `docs/CONFIG.md` y entre sí describen el repo tal como estaba al congelarlos.
- Ningún carril escribe en esta carpeta, y el legado no se edita para marcar un pendiente como resuelto.
  Un pendiente sale del legado solo cuando Chris lo promueve al plan vigente, y la promoción queda anotada allí, con su fecha.
