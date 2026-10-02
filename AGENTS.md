# PliegoStack — instrucciones para agentes

PliegoStack es una herramienta de ingeniería editorial para imprentas y editoriales de libros álbum, hecha con React, TypeScript, Vite y Zustand.

## Por dónde empezar

1. Lee `docs/PLAN.md`: es el único compromiso vigente y dice qué le toca a cada carril.
2. Trabaja solo en lo que el plan asigna a tu carril, respetando su alcance, sus no objetivos y sus criterios de aceptación.
   Si no tienes carril, no implementes: coordina.
3. Consulta `docs/CONFIG.md` antes de tocar cualquier archivo de `public/config/`.
4. `docs/legacy/` es el plan anterior, congelado: es registro y no compromiso.
   Un pendiente suyo solo entra al trabajo cuando Chris lo promueve a `docs/PLAN.md`.

## Comandos

- Usa Node 22.22.2, fijado en `.nvmrc`.
  Si `node -v` muestra otra versión, antepón `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"` a cada comando.
- `npm test` corre los tests con Vitest.
- `npm run build` hace el chequeo de tipos y el build de producción.
- `npm run preview` sirve el build para verificarlo en un navegador real.
- `npm run test:browser` corre el arnés de navegador con Playwright, en `e2e/`.
  Compila, sirve el build y mide en Chromium.
  Ahí van las afirmaciones sobre lo que la página mide, porque los tests de Vitest corren en jsdom, que no maqueta: allí `getBoundingClientRect` devuelve ceros y una aserción sobre anchos pasa diga lo que diga el CSS.

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
- Actualiza en `docs/PLAN.md` el incremento que cerraste y el commit que lo cerró.
- Si el incremento deja un supuesto que habría que confirmar con una imprenta real, dilo en tu reporte para que Chris lo lleve a la investigación.
  No lo escribas en `docs/legacy/`, que no se edita.
