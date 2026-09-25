---
type: "decision"
date: 2026-09-24
status: "accepted"
reversibility: "easy"
confidence: "high"
curated: false
---

# Decision: PliegoStack pausa la interfaz y replantea el plan desde una investigación de mercado

## Decision

Chris decide el 2026-09-24 pausar el trabajo de interfaz y móvil, investigar a qué imprentas les sirve PliegoStack, escribir un contexto de producto, y replantear el plan con los hallazgos.
La investigación arranca en una sesión nueva, con el handoff de `docs/handoffs` como entrada.

## Rationale

El plan vigente son más de 1300 líneas cuyo orden de incrementos se fijó antes de hablar con ninguna imprenta, y toda la configuración que trae el repo sigue declarada provisional.
Seguir construyendo sobre requisitos supuestos es lo que esta decisión interrumpe.

La sesión que replantee el plan no debe ser la que construyó la interfaz: puliría lo que acaba de medir en vez de preguntarse si sobra.
Empezar en sesión nueva compra esa distancia por el precio de un handoff.

## Alternatives considered

- Seguir con el incremento 5, tirada, merma y costo, que es lo que el plan marca como siguiente.
  Rechazada: el costo depende de precios y mermas que solo una imprenta real conoce, así que sería el incremento que más supuestos acumula, construido justo antes de ir a preguntar.
- Terminar móvil y accesibilidad primero.
  Aplazada, no rechazada: es trabajo acotado y con criterios claros, pero pulir la interfaz de un producto cuyo usuario no está caracterizado es optimizar antes de saber para quién.
- Hacer la investigación en esta misma sesión.
  Rechazada por el sesgo del autor, y por el costo de arrastrar un millón de tokens de detalle de CSS a una tarea que no los usa.

## Evidence

- Los cinco supuestos sin confirmar viven en «Decisiones pendientes» de `docs/PLAN.md` y se convierten en el cuestionario de la primera entrevista: densidad del cartón, tolerancias de tapa dura, sangrado en solapa, corrimiento en grupos de 4, y cuál de los dos dobleces se salta una firma de 8 páginas.
- Los seis archivos de `public/config` que declaran `source` declaran `provisional` en `true`, y la cabecera de la app lo dice en pantalla desde `31aa63f`.
- Estado verificado al pausar, sobre `8402c3e`: typecheck 0, 490 tests unitarios en 20 archivos, build 0, y 46 pruebas de navegador en Chromium.

## Follow-ups

- Chris entrega su aproximación previa hecha con ChatGPT como archivo, para que entre al repo como fuente y no como recuerdo.
- Decidir si el plan replanteado vive dentro de `docs/PLAN.md` o en un documento nuevo.
- Decidir si UX-7 y UX-8, en pausa desde el 2026-09-19, siguen teniendo sitio ahora que el catálogo es una de las tres vistas centrales.
- Quedan 9 commits sin empujar; Chris empuja a mano, y el candado de pre-push exige revisión independiente de todo lo que se publique.
