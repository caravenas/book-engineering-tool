# Revisión de UX — PliegoStack

Aprobado por Chris el 2026-09-16.
Alcance: arquitectura de información, flujo e interacción.
No es un restyle: se conserva la tipografía, la paleta, el vocabulario de tarjetas y estadísticas y el ritmo de espaciado actuales, definidos en `src/styles/index.css`.
Basado en la lectura de `docs/PLAN.md`, `docs/CONFIG.md`, `src/App.tsx`, los cuatro componentes de `src/components/`, `src/store/useBookStore.ts` y los motores de `src/engine/`, en el commit `aebf829` de `master`.

## 1. Diagnóstico de la experiencia actual

### 1.1 Densidad y scroll

La app renderiza cuatro paneles en una rejilla de dos columnas fija, con el orden de lectura Formato, Imposición por firmas, Sustrato y Lomo y peso.
El panel inferior derecho hace dos trabajos a la vez: calcula lomo y peso del interior, y además aloja el selector de encuadernación, sus estadísticas, el texto de corrimiento y las fórmulas.
Ese panel es a la vez el último en orden de lectura y el más largo, así que la información de encuadernación queda al final del recorrido visual en cualquier resolución.
Bajo 768 píxeles la rejilla colapsa a una columna y los paneles se apilan en el mismo orden, con Encuadernación detrás de tres paneles completos.
El incremento 4 añadirá un quinto panel con más superficie, así que agregarlo a una rejilla ya desbordada empeora el problema en vez de resolverlo.

### 1.2 La palabra «pliego» nombra dos objetos distintos

`creepCompensation` calcula los pliegos anidados como el total de páginas dividido por 4, un valor fijo, independiente del esquema de plegado seleccionado en Imposición por firmas, que puede ser de 8 o 16 páginas.
Así, «pliego» nombra dos objetos de producción distintos: el pliego de prensa sin plegar que se consume por ejemplar, y un pliego ya plegado de exactamente 4 páginas que solo se usa para calcular el corrimiento.
A eso se suma un tercer uso, «Hojas» en el panel de lomo, que nombra la hoja física final del bloque interior.
Cada uso, leído por separado, es correcto y trae su etiqueta; el problema es que la misma raíz describe un objeto antes de plegar y otro después, en dos paneles distintos, sin que la interfaz diga nunca en qué momento de producción ocurre cada uno.
Con grapa el aporte al lomo es 0, así que la primera y la tercera tarjeta muestran el mismo número; aunque la etiqueta cambia a «Grosor del papel en el pliegue», dos números idénticos juntos leen como una tarjeta sin efecto.

### 1.3 Las notas «Fuente» se repiten

Hay cinco instancias en pantalla: una en Sustrato, tres en Imposición por firmas y una en Encuadernación.
Las cinco usan la misma plantilla de oración y, en los archivos de ejemplo, casi el mismo texto, así que el usuario lee prácticamente la misma frase cinco veces.
En Sustrato la nota está debajo del número de calibre, es decir, debajo del dato más prominente del panel; en los demás paneles ya está bien colocada, justo debajo de su selector.

### 1.4 La editabilidad de catálogos es inconsistente

Solo los gramajes y los pliegos tienen alta, listado con sufijo, nota de origen propia y baja individual.
Proporciones, prensas, esquemas de plegado y encuadernaciones son selectores puros, sin ningún camino de edición.
La única pista de esa diferencia es la presencia o ausencia de un botón «+», y no hay explicación en pantalla de por qué existe.

### 1.5 Hallazgos menores

El título del primer panel está en inglés, «Canvas Designer», en una interfaz que en todo lo demás está en español.
Los botones de eliminar gramaje y pliego personalizados quedan por debajo del objetivo táctil de 44 por 44 píxeles.
El foco de teclado de los campos es casi imperceptible, porque usa una sombra del mismo color y grosor que el borde ya visible.
El token `--color-border-active` está definido y no se usa en ninguna regla, así que es el candidato natural para ese foco visible sin inventar un color nuevo.

## 2. Arquitectura de información propuesta

### 2.1 Principio de agrupación

Los paneles se agrupan por forma de contenido, no por un orden narrativo inventado.
**Diseño de la página** reúne Formato de página y Sustrato, que son entradas cortas e independientes entre sí, sin diagramas grandes.
**Producción** reúne Imposición por firmas, Lomo y peso del interior, Encuadernación y Tapa, que dependen de los datos anteriores y añaden diagramas o cuadrículas de estadísticas.
Esta agrupación conserva el orden que ya existe entre Formato, Imposición y Lomo y peso; el único cambio relativo es mover Sustrato junto a Formato de página.
Ese cambio no está respaldado por investigación de usuarios: la justificación es de forma de contenido, no de flujo observado, y es el primer punto a revisar si una prueba con usuarios muestra otra cosa.

### 2.2 Disposición

Desde unos 1200 píxeles de ancho, una banda de dos columnas para Formato de página y Sustrato, seguida de una pila de ancho completo para Imposición por firmas, Lomo y peso del interior, Encuadernación y Tapa.
Por debajo de unos 960 píxeles, una sola columna para todo, que es el comportamiento que la hoja de estilos ya implementa.
Se simplifica a un único punto de quiebre en vez de los tres niveles actuales, para reducir casos de borde sin tocar ningún token visual.
Opcionalmente, un rótulo de sección reutilizando el estilo de etiqueta ya existente encima de cada grupo, que debe evaluarse contra el principio de no decorar de más antes de construirlo.
Encuadernación deja de ser una sección sin título dentro del panel de lomo y pasa a ser su propio panel con su propio título.
Tapa entra como sexto panel al final de Producción, porque depende del lomo final que produce Encuadernación.

### 2.3 Wireframe estructural

```
┌──────────────────────────────────────────────────────────┐
│ PliegoStack                      [Calculadora|Configuración] │
├───────────────────────────┬──────────────────────────────┤
│ Formato de página          │ Sustrato (papel)              │
├───────────────────────────┴──────────────────────────────┤
│ Imposición por firmas                                      │
├──────────────────────────────────────────────────────────┤
│ Lomo y peso del interior                                   │
├──────────────────────────────────────────────────────────┤
│ Encuadernación                                             │
├──────────────────────────────────────────────────────────┤
│ Tapa blanda y dura (incremento 4)                          │
└──────────────────────────────────────────────────────────┘
```

### 2.4 Alternativa considerada y descartada

Se evaluó mantener la rejilla de dos columnas con la izquierda fija mediante posicionamiento adherente, para comparar el lomo con el formato sin volver a subir.
Se descarta porque reintroduce el problema de raíz, ya que una columna seguiría acumulando cuatro paneles largos, y porque añade una interacción nueva que puede tapar contenido en pantallas bajas.
Si más adelante se observa que los usuarios necesitan comparar Formato y Encuadernación sin desplazarse, esta es la primera alternativa a reconsiderar.

## 3. Diseño de la personalización

### 3.1 Un solo modelo de datos, dos puertas de entrada

Las dos audiencias hacen lo mismo, añadir, editar u ocultar entradas de los mismos seis catálogos; lo que cambia es la frecuencia y el lugar.
La **alta rápida en el lugar de uso** generaliza el patrón que ya funciona en Sustrato y en Imposición por firmas a proporciones, prensas y encuadernaciones, que son registros planos con pocos campos numéricos.
La **pantalla de Configuración** lista los seis catálogos completos, con edición, ocultamiento y exportación e importación en bloque, pensada para quien carga sus datos una vez.
Ambas puertas escriben en la misma capa de usuario, así que lo añadido con el botón «+» aparece también en Configuración y viceversa.
Los esquemas de plegado quedan fuera del alta rápida: un esquema es una cuadrícula de posiciones con página y rotación, y un formulario amigable para eso es en la práctica un editor visual de imposición, que es una funcionalidad propia.

### 3.2 Por defecto frente a superposición del usuario

Por cada catálogo, la capa de usuario guarda solo tres tipos de registro, nunca una copia completa.
Un **alta** es una entrada nueva con un id reservado que nunca choca con uno de fábrica.
Un **parche** guarda únicamente los campos que el usuario cambió de una entrada de fábrica, identificados por su id y su archivo.
Un **ocultamiento** marca un id de fábrica como oculto, sin borrar nada del archivo, que es inmutable.
El catálogo efectivo se calcula en cada carga como los datos de fábrica más la capa de usuario, nunca se persiste fusionado, que es la generalización directa de lo que el store ya hace hoy con gramajes y pliegos.
Cada entrada lleva un distintivo de origen con tres estados: «de fábrica», «editado» y «tuyo», con una palabra en vez del asterisco actual.

### 3.3 Qué pasa cuando los datos de fábrica cambian

Como el parche guarda solo los campos tocados, una entrada editada hereda los campos nuevos que traiga una actualización y conserva los que el usuario sí cambió.
Si una actualización elimina el id al que apunta un parche o un ocultamiento, ese registro queda huérfano: se conserva en el almacenamiento, se excluye del catálogo efectivo y se avisa una sola vez, nombrando lo afectado y ofreciendo eliminarlo o exportarlo.
Este modelo de parches es lo que sobrevive sin cambios cuando llegue el backend: cambia dónde viven los registros, no su forma.

### 3.4 Persistencia, límites y exportación

Para este MVP el almacenamiento local del navegador alcanza, porque son seis catálogos pequeños, muy por debajo del límite por origen.
Los límites se comunican en una nota siempre visible en Configuración, no escondida: estos datos se guardan solo en este navegador, y para llevarlos a otro equipo o respaldarlos hay que exportarlos.
La exportación e importación usan el mismo formato JSON que la app ya lee, lo que reutiliza el validador existente con sus mensajes de archivo, ruta y motivo, y permite que un archivo exportado se copie a la configuración del despliegue para convertirse en el nuevo dato de fábrica.
Se ofrecen dos exportaciones: solo los cambios del usuario, para respaldar o mover, y el catálogo completo, para entregar el nuevo dato de fábrica.
La importación valida antes de aceptar, fusiona sin borrar lo existente y pide confirmación explícita ante un choque de identificadores, nunca sobrescribe en silencio.

### 3.5 Degradación cuando no hay almacenamiento

Al arrancar se comprueba una vez si el almacenamiento está disponible; si falla, la app sigue funcionando completa con los datos de fábrica, sin deshabilitar ninguna acción.
Se muestra un aviso descartable que explica que no se pudo guardar la configuración personalizada y que los cambios se perderán al recargar.
Las altas y ediciones siguen funcionando en memoria durante la sesión, y su confirmación queda calificada como guardada solo para esa sesión.
Si el fallo ocurre a mitad de sesión, se captura en el momento de la escritura y el valor recién introducido se conserva en memoria en vez de perderse.

## 4. Estados por pantalla

El contrato genérico reutiliza lo que la app ya hace: una sola carga real al inicio, el bloque de error existente para configuración corrupta, estados vacíos explicados en las listas de personalización, y el rechazo de entradas inválidas con mensaje explícito.
La capa de usuario añade una lectura breve del almacenamiento que debe fusionarse en la carga inicial, no encadenarse como un segundo indicador.
Formato de página no necesita cambios, porque ya cubre entrada inválida.
Sustrato necesita un estado inválido propio para el alta de sustrato completo, además del que ya existe para gramaje.
Imposición por firmas ya tiene un estado vacío bien resuelto cuando ningún esquema cabe, y se conserva tal cual.
Lomo y peso conserva su estado inválido y pierde el bloque de encuadernación.
Encuadernación hereda sus tres estados ya construidos y necesita un estado vacío nuevo para cuando no hay ningún método en el catálogo.
Tapa reserva su lugar y detallará sus estados cuando se especifique el incremento 4.
Configuración necesita los cinco estados propios, con el mismo validador reutilizado para la entrada inválida.
Importar necesita carga mientras valida, error con la lista del validador y un resumen de lo importado.
Exportar es síncrona y su único estado no trivial es no tener nada que exportar, que debe explicarse en vez de descargar un archivo vacío.

## 5. Accesibilidad y responsive

Todo control nuevo lleva etiqueta programática, siguiendo el patrón que ya cumplen todos los campos actuales.
Los avisos no urgentes usan el rol de estado y los errores que bloquean un cálculo usan el rol de alerta, que es la distinción que la app ya aplica.
El interruptor entre Calculadora y Configuración se construye con el grupo de segmentos que ya existe, con su estado presionado; no es un modal, así que no atrapa el foco.
Al cambiar de vista, el foco se mueve al encabezado de la vista nueva.
El orden de tabulación sigue el orden visual propuesto, y debe verificarse con navegación de solo teclado que ningún control queda fuera.
El foco visible de los campos se corrige usando el token ya definido y sin uso, con un anillo separado del borde.
Los botones de eliminar suben a 44 por 44 píxeles sin cambiar su apariencia.
Los distintivos de origen deben ser legibles como texto por un lector de pantalla, no depender de color ni de un símbolo.
El punto de quiebre exacto debe ajustarse probando el contenido real en un navegador, no fijarse de antemano.

## 6. Redacción

La tarjeta «Hojas» pasa a «Hojas de papel (interior)», con su etiqueta programática equivalente.
La tarjeta «Pliegos por ejemplar» pasa a «Pliegos de prensa por ejemplar».
La línea de corrimiento pasa a explicar que la encuadernación anida pliegos plegados de 4 páginas, que el más externo se desplaza y el más interno no, y que ese pliego plegado es distinto del pliego de prensa de Imposición por firmas, porque aquí se cuenta cada grupo de 4 páginas ya plegado sin importar el esquema elegido arriba.
Esa última frase es necesaria y no cosmética, porque el cálculo usa siempre grupos de 4 páginas.
Las notas de origen se reformatean en dos líneas cortas, con el archivo en monoespaciado y el texto de origen debajo, sin el prefijo «Fuente:» que la posición ya hace redundante, y sin acortar ni ocultar un texto que puede ser real en producción.
La nota de Sustrato se mueve debajo del selector de gramaje, como en los demás paneles.
Cuando una entrada es del usuario, la nota se reemplaza por el distintivo de origen y nunca coexisten ambas.
El título «Canvas Designer» pasa a «Formato de página».

## 7. Secuencia de implementación

Cada incremento sigue la convención del plan: un commit único y reversible, tests de motor, store e interfaz, y verificación en navegador real para cambios visibles.

**UX-1 — Reordenar y dividir paneles, sin tocar motores ni datos.**
Separar el panel de lomo en dos, Lomo y peso del interior y Encuadernación, moviendo solo el marcado, y aplicar la disposición propuesta.
Aceptación: los tests y el build terminan en 0; un test de interfaz verifica el orden de los títulos en el DOM; en un navegador a 1440 por 900 el selector de encuadernación es visible con un desplazamiento como máximo; los resultados numéricos con los valores por defecto no cambian.

**UX-2 — Corregir «hojas» y «pliegos» y las notas de origen.**
Aceptación: un test busca las cadenas nuevas en el DOM; verificación manual de que ningún panel muestra dos notas idénticas juntas.

**UX-3 — Foco visible y tamaño de los botones de eliminar.**
Aceptación: verificación con navegación de teclado de que el foco es perceptible; los estilos computados confirman el tamaño mínimo.

**UX-4 — Generalizar el alta rápida a proporciones, prensas y encuadernaciones.**
Aceptación: un test de store por catálogo replica los tests existentes de gramaje y pliego, con id duplicado rechazado, campo inválido rechazado y alta exitosa que selecciona y recalcula; se excluyen los esquemas de plegado.

**UX-5 — Persistencia de la capa de usuario en el navegador.**
Aceptación: un test confirma que las altas persisten tras remontar la app; otro simula que la escritura falla y confirma que la app sigue funcionando con el aviso visible y las altas en memoria.

**UX-6 — Editar y ocultar entradas de fábrica con el modelo de parche.**
Aceptación: tests de aplicar parche, ocultar y detectar huérfanos; un huérfano no se aplica pero tampoco se borra.

**UX-7 — Pantalla de Configuración.**
Aceptación: toda entrada muestra su distintivo de origen; la navegación de teclado alcanza todos los controles en el orden propuesto.

**UX-8 — Exportar e importar catálogos.**
Aceptación: un test de ida y vuelta confirma que exportar e importar reproduce el mismo catálogo efectivo; un archivo inválido se reporta con la misma forma de error que el arranque.

**UX-9 — Editor visual de esquemas de plegado, más adelante.**
Queda pendiente decidir si los esquemas se siguen editando solo por importación o si se justifica un editor dedicado.

## 8. Qué no se propone

No se propone ningún cambio visual: tipografía, paleta, radios, sombras y espaciado quedan como están.
No se proponen pestañas, asistentes de varios pasos ni acordeones colapsados por defecto.
No se proponen cuentas de usuario ni sincronización, que son la etapa de backend; este diseño solo se asegura de no bloquearla.
No se propone un editor visual de esquemas de plegado en este alcance.
No se propone cambiar ningún motor, incluido el corrimiento fijo de 4 páginas por pliego plegado, que se señala como hallazgo para revisar cuando corresponda.
No se propone ninguna dependencia nueva.
No se propone almacenamiento indexado para este MVP.
No se propone detectar automáticamente si el texto de origen es genérico para acortarlo, por frágil y por riesgo de ocultar un dato real.
Quedan sin resolver, por falta de evidencia, el punto de quiebre exacto y si conviene mover Sustrato antes que Imposición.
