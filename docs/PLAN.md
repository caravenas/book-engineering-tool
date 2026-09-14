# Plan canónico de PliegoStack

## Snapshot

- El snapshot aprobado parte de `b42ec4e` y contiene un prototipo cuyo cálculo aceptaba valores no finitos, materializaba todas las ubicaciones y podía conservar resultados obsoletos tras un error.
- La auditoría también confirmó que los gramajes personalizados no pertenecían a un sustrato inequívoco, que el calibre se autocompletaba sin validación y que la interfaz sobreprometía capacidades industriales.
- El probe sintético de 100, 250 y 500 ubicaciones fue barato en Node y markup, pero el navegador quedó bloqueado, por lo que el límite de 250 es provisional y exclusivo de la vista previa.
- El comando `npm test` fallaba en Node 22.22.2 por Tinypool, mientras que Vitest con threads en modo single-thread terminaba correctamente.

## Target

- Este incremento debe dejar cálculos finitos o errores explícitos, estado recuperable sin resultados obsoletos, gramajes personalizados correctos por sustrato y copy observacional honesto.
- La vista previa debe generar como máximo 250 ubicaciones antes de iterar y debe conservar completos los totales, rejillas y áreas cuando la aritmética sea segura.

## Alcance y no objetivos

- El alcance incluye únicamente seguridad de los motores, actualización atómica del store, corrección de gramajes personalizados, protecciones de geometría visual, copy honesto, runtime reproducible y pruebas automatizadas.
- Este incremento no añade dependencias, backend, servicios externos, datos reales, límites industriales, fórmulas nuevas ni cambios fuera de los archivos aprobados.
- Este incremento no constituye validación B2B ni autoriza contacto, datos, outreach, pilotos, pagos o afirmaciones de capacidad industrial.
- Toda demostración sigue prohibida hasta una autorización separada, aunque el prototipo quede preparado para observación con entradas sintéticas.

## Aceptación

- `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" node --version` debe imprimir exactamente `v22.22.2`.
- `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" npm test` debe terminar con código 0 sin argumentos adicionales.
- `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" npm run build` debe terminar con código 0.
- `git diff --check b42ec4e29a..HEAD` debe terminar con código 0.
- La comparación de dependencias entre `b42ec4e` y el worktree debe mostrar cero paquetes añadidos, eliminados o actualizados, aunque `package.json` también ajuste el script de build para el sandbox.
- Cada actualización de una entrada de cálculo debe publicar atómicamente la entrada y los resultados o errores de aprovechamiento y lomo, sin que una suscripción observe una entrada inválida junto con un resultado correspondiente anterior no nulo.
- Los controles modificados deben tener etiquetas programáticas, grupos con nombre y estados seleccionados o expandidos que expongan correctamente la interacción.
- La aritmética derivada de sangrado y SVG debe rechazar valores no finitos y pérdidas de precisión bidireccionales de la contribución de página y de sangrado, y el disclosure de gramaje personalizado debe anunciar su estado expandido y formulario asociado.
- Las páginas vacías deben convertirse en 0 para invalidar visiblemente el resultado de lomo, y el texto original de una entrada de páginas no segura debe conservarse mientras los cálculos se invalidan hasta introducir un valor válido.
- Los conteos impares de páginas deben incluir la última hoja física completa, y el texto que no represente un entero decimal positivo debe rechazarse antes de convertirlo con `Number`.
- El estado `aria-invalid` de páginas debe depender solo de que el texto original represente un entero decimal seguro positivo y debe describir de forma persistente ese requisito, sin sustituir la alerta global de errores de lomo.
- La vista previa exterior, incluido el sangrado, debe permanecer dentro de sus límites de ancho y alto sin depender de recorte CSS y debe recuperarse sin estilos no finitos cuando una aritmética derivada de dimensiones, escala o sangrado finitos desborde o se reduzca a cero.
- Los valores finitos extremos de lomo y peso deben conservar una representación de texto finita aunque el redondeo decimal ordinario desborde.
- Los pliegos personalizados con dimensiones vacías, no finitas o no positivas deben conservar la selección y el resultado actuales, explicar la recuperación y poder añadirse después con dimensiones válidas.
- Las pruebas deben cubrir la eliminación de gramajes personalizados mediante un clic real en el botón accesible, que también conserva su semántica nativa de teclado y táctil.
- La búsqueda en `index.html` y `src/components` debe confirmar que las afirmaciones prohibidas ya no aparecen como copy de usuario.
- `git status --short --branch` y `git diff --stat` deben cerrar la verificación del único diff aislado.
- La interfaz expresa los gramajes en g/m², mantiene etiquetas grupales estables para el tamaño del pliego y omite números de página de la vista previa cuando la densidad impide leerlos.

## Rollback

- Antes de la integración, el rollback consiste en descartar la rama aislada.
- Después de la integración, el rollback consiste en revertir el único commit de este incremento.

## Secuencia posterior

- El paquete B2B interno será un incremento posterior y no implica ejecución comercial ni demostraciones autorizadas.
- La lista pública requerirá una autorización separada antes de compilarse o utilizarse.
- El outreach requerirá otra autorización separada antes de cualquier contacto.
- Los días 6–12 se planificarán solamente después de las autorizaciones previas y con evidencia observacional aprobada.
- El piloto requerirá alcance, contraparte y autorización explícitos antes de comenzar.
- El pago se evaluará únicamente después de un piloto autorizado y sin asumir validación anticipada.
