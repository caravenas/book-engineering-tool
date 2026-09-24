---
type: "learning"
date: 2026-09-22
curated: false
---

# Learning: El typecheck por edicion bloquea casi la mitad de las ediciones de un cambio en varios pasos

## Context

Mismo analisis. La etapa rapida del contrato de verificacion de book-engineering-tool corre tsc --noEmit sobre el proyecto entero despues de cada edicion, 6,2 s medidos.

## What changed

- Nada: el contrato es una ruta protegida de ese repositorio y lo edita Chris.

## Validation

- En los 30 subagentes: 167 bloqueos sobre 370 ediciones, 45%. 78 de ellos, 47%, eran solo TS6133 'declarado y no usado', el estado normal entre la edicion que agrega un import y la que lo usa. En la sesion principal los 9 bloqueos eran errores reales del archivo editado.

## What failed or surprised us

- Unos 400 typechecks de 6,2 s son cerca de 41 minutos de hook sincrono, dos tercios del costo del harness en la sesion. Y el pre-commit, que no existia cuando se escribio el contrato, ya garantiza que nada roto se commitee.

## Reusable pattern

Un check de programa entero no es un check por edicion: entre dos pasos de un cambio el programa esta inconsistente por construccion. La senal que importa va al terminar el cambio, en el Stop y en el pre-commit.

## Decisions

_(none)_

## Follow-ups

- Proponerle a Chris vaciar la etapa rapida o dejarla en un check por archivo, ahora que el pre-commit cubre la garantia.

## Should update AGENTS.md?

No: es una decision del contrato de ese repositorio.
