# Playbook de proyecto: fix-bug

Carril: `build`.
Instancia con parámetros del playbook global `bug-fixing`: la receta, sus pasos y sus patrones son los de `~/.agents/playbooks/bug-fixing.md`, y aquí se declara solo lo propio de PliegoStack.
Se nombra en el objetivo de la sesión, porque `capitan --playbook` solo encuentra playbooks globales.

## Contexto

```yaml
context_sources:
  required:
    - id: architecture
      path: "context/architecture/overview.md"
      how: load
      why: "Las capas y el mapa de src/, para ubicar dónde puede estar la causa."
    - id: engines
      path: "context/architecture/engines.md"
      how: load
      why: "Qué calcula cada motor y en qué orden, para separar un error de cálculo de uno de interfaz."
  optional:
    - id: state
      path: "context/architecture/state.md"
      how: load
      why: "Si el bug es de estado, de recálculo o de persistencia."
    - id: config
      path: "context/architecture/config.md"
      how: load
      why: "Si el bug nace de un dato de public/config/ o de su validación."
    - id: domain
      path: "context/domain/"
      how: search
      why: "Si el resultado discutido es una cifra del oficio: qué dice el oficio y con qué estado."
```

## Pasos

Los de `bug-fixing`, con estos ajustes:

- **Reproducir primero, lo más cerca posible del escenario real del usuario.**
  Si el bug afecta lo que el usuario ve, la reproducción es de extremo a extremo: una prueba del arnés de navegador en `e2e/`, no solo una de Vitest.
  Sin causa raíz confirmada, un arreglo es una conjetura.
- La prueba de regresión falla antes del arreglo y pasa después.
- El arreglo es el cambio mínimo que corrige la causa confirmada.
- Si el arreglo falla la verificación dos veces, el ciclo se detiene: la diagnosis la hace un proveedor distinto del que lo escribió, sin editar nada, y si tras aplicarla sigue fallando se escala a Chris.
- Revisión independiente obligatoria si el diff toca `src/engine/` o `public/config/`.

## Reglas propias

- **Dónde escribe**: `src`, `e2e`, `public`, `context/architecture`, `docs/decisions` y `docs/learnings`, como el resto del carril `build`.
- **Dónde trabaja**: en un worktree de `integrate/<sesión>`.
- **Node 22.22.2**, y la verificación de `build-feature.md`: `npm test`, `npm run build`, y `npm run test:browser` si el bug o su arreglo es visible.
- Un commit reversible con prefijo `fix:`, en inglés.
- Si el bug resulta ser un dato de imprenta equivocado y no un defecto de código, no se corrige aquí: se avisa al orquestador, porque cambiar `public/config/` por datos de una imprenta pasa por `docs/PLAN.md`.
