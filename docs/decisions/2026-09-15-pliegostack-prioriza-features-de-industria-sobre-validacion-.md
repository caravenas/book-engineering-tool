---
type: "decision"
date: 2026-09-15
status: "accepted"
reversibility: "easy"
confidence: "high"
curated: 2026-09-17
---

# Decision: PliegoStack prioriza features de industria sobre validacion comercial

## Decision

PliegoStack deja de planificar validaciones comerciales, entrevistas, listas de prospectos, outreach y pilotos.

Se implementan features que la industria grafica necesita: imposicion por firmas, tipos de encuadernacion, tapa blanda y dura, y tirada, merma y costo.

Todo dato dependiente de imprenta, proveedor o mercado vive en JSON leido en runtime desde public/config/, validado al cargar, con valores de ejemplo reemplazables por datos reales sin recompilar.

## Rationale

Chris no quiere invertir tiempo en validacion con potenciales clientes; el plan anterior encadenaba seis etapas de autorizacion antes de cualquier feature.

Runtime JSON permite configurar datos reales despues del despliegue sin rebuild.

## Alternatives considered

- Mantener las Etapas 1-6 con gates de autorizacion (descartado por Chris).
- JSON empaquetado en src/config/ validado al compilar (mas simple, pero exige rebuild por cada cambio de datos).

## Evidence

- Instruccion de Chris en la sesion relay 2026-09-15-151945-analiza-en-quedo-el-repositori.
- docs/PLAN.md reescrito en book-engineering-tool (sin commitear al registrar).

## Follow-ups

- Aprobar e implementar el incremento 1: configuracion en runtime.
- Antes del incremento 2, decidir si la imposicion incluye numeracion de paginas por esquema de plegado.

Curated: 2026-09-17 — kept as history, not promoted: project fact already in book-engineering-tool docs/PLAN.md and AGENTS.md
