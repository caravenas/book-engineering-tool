---
type: "decision"
date: 2026-10-02
status: "accepted"
reversibility: "easy"
confidence: "high"
curated: false
---

# Decision: PliegoStack se organiza en tres capas con dos frentes independientes, research y build

## Decision

Chris aprueba el 2026-10-02 la propuesta de tres capas (docs/2026-09-26-propuesta-tres-capas.md): harness global sin cambios, harness de producto en .agents/, y contexto de producto en context/.

El plan anterior se congela en docs/legacy/ con un backlog heredado, y docs/PLAN.md vuelve a existir como único compromiso vigente.

El trabajo corre en dos frentes con territorios de escritura disjuntos, research y build, declarados como carriles en la política del repositorio.

## Rationale

La pausa del 2026-09-24 pedía investigar a qué imprentas les sirve la herramienta sin que la investigación y la construcción se pisen.

Separar el oficio (context/domain), lo que se sabe del mercado (context/market), lo que el producto es (context/product) y cómo está construido (context/architecture) hace que cada afirmación tenga un dueño y un estado.

Un carril solo estrecha el territorio de una sesión, y el commit lo hace cumplir, así que dos sesiones en el mismo repositorio no escriben en el territorio del otro.

## Alternatives considered

- Dejar docs/PLAN.md vivo con punteros: mantiene el incremento 5 como compromiso, contra la decisión de pausa.
- Seis flujos al mismo nivel: se agrupan en dos carriles, que es la unidad que el harness aplica.
- Que Chris apruebe cada cambio a context/domain: la confirmación de un supuesto es lo que la investigación aporta, y Chris no tiene el conocimiento de dominio para juzgarla (D3).
- Sembrar context/market en la migración: es una fuente nueva, no una reorganización de lo que el repo ya sabe.

## Evidence

- Migración en siete commits sobre master, desde 92bfda7 (fase 1), sin empujar; cada fase verificada con enlaces, las tres búsquedas de la sección 4 de la propuesta y git status.
- Línea base del código el 2026-10-02 sobre f28666c: tsc 0, 490 tests en 20 archivos, build, 46 pruebas de navegador; la migración no toca código.

## Follow-ups

- Abrir los dos carriles con sesion --lane y verificar con session.mjs list --repo . que quedaron registrados con su carril.
- UX-8 se construye como exportación de la ficha técnica en página imprimible; importar y exportar catálogos quedan en docs/legacy/backlog-heredado.md.
