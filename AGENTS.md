# PliegoStack — instrucciones para agentes

PliegoStack es una herramienta de ingeniería editorial para imprentas y editoriales de libros álbum, hecha con React, TypeScript, Vite y Zustand.

## Por dónde empezar

1. Lee `docs/PLAN.md`: es el plan canónico, dice qué incrementos están cerrados y cuál es el siguiente.
2. Implementa solo el incremento que el plan marca como siguiente, respetando su alcance, sus no objetivos y sus criterios de aceptación.
3. Consulta `docs/CONFIG.md` antes de tocar cualquier archivo de `public/config/`.
4. `docs/UX-REVIEW.md` está aprobada, pero se ejecuta después del incremento 4; no la mezcles con otro incremento.

## Comandos

- Usa Node 22.22.2, fijado en `.nvmrc`.
  Si `node -v` muestra otra versión, antepón `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"` a cada comando.
- `npm test` corre los tests con Vitest.
- `npm run build` hace el chequeo de tipos y el build de producción.
- `npm run preview` sirve el build para verificarlo en un navegador real.

## Reglas del proyecto

- Los motores de `src/engine/` son funciones puras: reciben los datos de configuración como argumentos y nunca los importan.
- Todo dato que dependa de una imprenta, un proveedor o un mercado va en un JSON de `public/config/`, con su campo `source`, y se documenta en `docs/CONFIG.md` como valor de ejemplo.
- Cada motor rechaza entradas no finitas o fuera de rango con errores explícitos.
- No añadas dependencias sin aprobación de Chris.
- Cada incremento termina en un único commit reversible con tests de motor, store e interfaz.
- Un incremento con cambios visibles se verifica también en un navegador real sobre `npm run preview`.
- Los mensajes de commit van en inglés, con prefijo convencional (`feat:`, `docs:`, `test:`, `chore:`), y sin coautores de agentes.

## Al cerrar un incremento

- Confirma con la salida real de `npm test` y `npm run build`, y con `git status`, antes de declarar el trabajo terminado.
- Actualiza en `docs/PLAN.md` la sección «Estado actual» y la línea que registra qué incrementos están cerrados y en qué commit.
- Registra en «Decisiones pendientes» cualquier supuesto que haya que confirmar con una imprenta real.
