# Retrospectiva de PliegoStack como experimento de arquitectura de agentes

**Propuesta y registro, no compromiso.**
No cambia `docs/PLAN.md` ni `context/product/`.
Lo que de aquí deba pasar a la arquitectura global lo decide Chris.

Escrita el 2026-10-04 por el capitán orquestador (sesión sin carril).
Los hechos de la sección 2 se comprobaron contra el repositorio el mismo día; lo que no pude comprobar está marcado.

## 1. Para qué se hizo

Según Chris, el objetivo original de PliegoStack no era el negocio.
Era probar su arquitectura de agentes en un proyecto real, refinar cómo se aborda un proyecto desde cero, y llegar al siguiente proyecto con un proceso ya afinado.
Esta retrospectiva se juzga contra ese objetivo.
Que PliegoStack no tenga mercado probado no es un fracaso del experimento; que el experimento no enseñe qué cambiar sí lo sería.

## 2. Qué se hizo, con cifras

- 75 commits `docs`, 46 `feat`, 13 `fix` y 7 `test`, sobre un total de 166 commits desde el primero, del 2026-03-17 (los tipos se contaron sobre los diez prefijos más frecuentes).
  El trabajo intenso corre del 2026-09-14 al 2026-10-03.
- Unas 12.900 líneas de código de producto y unas 10.900 de tests (unitarios y de navegador).
- 22 archivos de investigación en `docs/research/` y unas 2.000 líneas de `context/`.
- Cinco decisiones registradas en `docs/decisions/`; la última (2026-10-02) fija la organización en tres capas.
- Una migración en siete fases, dos carriles trabajando en paralelo, cuatro borradores de contacto sin enviar y una propuesta de negocio.
- Cero conversaciones con una imprenta o editorial.
- **No medido:** el tiempo total, los tokens y el costo. No tengo esos datos, y sin ellos esta retrospectiva no puede decir si el arnés valió lo que costó.

## 3. Qué funcionó

Cada punto indica cómo se comprobó.

- **Las capas separan bien lo estable de lo cambiante.**
  La migración se ejecutó por fases, cada una verificada antes de pasar a la siguiente, sin empujar nada.
- **Dos carriles en el mismo repositorio no se pisaron.**
  Todos los commits de `research` llevan `Agents-Lane: research` y sus archivos están dentro de sus rutas.
  `build` entregó UX-8 sin tocar motores, datos de `public/config/` ni dependencias.
- **La revisión por otra familia de modelos atrapó errores reales.**
  Un revisor encontró 12 imprecisiones en la documentación de arquitectura, que verifiqué contra el código y corregí antes del commit.
  Los borradores pasaron tres rondas de revisión de otra familia y la propuesta de negocio, dos.
- **No confiar en el reporte del agente.**
  Verificar commits, archivos y trailers contra el sistema de registro detectó, entre otras cosas, que mi propio README del legado describía mal UX-8.
- **La investigación sin contacto.**
  El carril `research` produjo perfiles con fuente y fecha, estados de supuestos y una propuesta con `[verificado]`, `[inferencia]` y `[desconocido]`, sin enviar un solo correo.
- **La propuesta de negocio se buscó a sí misma las objeciones.**
  Entregó un documento que dice, sobre su propia recomendación, que no sobrevive la objeción de quién paga.

## 4. Qué se rompió o quedó a medias

- **La ruta de carril no expande `~`.**
  El carril `research` no pudo escribir en `~/Documents/pliegostack/borradores`, y los borradores tuve que copiarlos yo.
  La política exige ruta absoluta; no hay aviso previo que lo diga.
- **El candado de push no escala a un lote grande.**
  `review-gate` tiene un tope de 300 KB y solo Chris puede fijar un baseline. Hoy hay 39 commits sin empujar.
  Que el pre-push exija revisión para este rango es probable (el rango toca `src/engine/folding.ts` con un comentario) pero no lo ejecuté para confirmarlo.
- **Los monitores por estado son ruidosos.**
  El estado de un panel oscila entre `working`, `done` e `idle` entre una revisión de Codex y otra.
  Hubo que cambiar a disparadores por parada sostenida sin shell activo, y aun así hubo una falsa alarma por un error mío en un script.
- **«Terminé» no significa terminado.**
  Varias veces un agente reportó cierre y seguía con una revisión corriendo.
- **Una sesión no puede responderse a sí misma sobre si se pasó del plan.**
  La propuesta de negocio decidió sola, tras dos rondas de Codex, no hacer una tercera y lo dijo; es honesto, pero la regla de las dos rondas decide por Chris más de lo que debería.
- **Dos sesiones del mismo carril conviven sin coordinación.**
  Funcionó porque la primera estaba detenida. Nada en el arnés lo impide si no lo está.
- **Un hecho que no pude comprobar:** si el carril se hace cumplir en Claude Code más allá del filtro de commit. Verifiqué el commit y los trailers; no hice una prueba de escritura fuera del carril.

## 5. El hallazgo central: no hubo decisión de entrada

Esto es lo que más importa para el siguiente proyecto.

- El 2026-09-15 Chris registró que PliegoStack **deja de planificar validaciones comerciales** y prioriza features de industria.
  Razón dada: no quería invertir tiempo en validar con potenciales clientes.
- Entre esa fecha y el 2026-09-24 hubo 119 commits, entre ellos 30 el 09-19 y 19 el 09-20.
- El 2026-09-24 la decisión se revirtió: se pausó la interfaz para investigar a quién le sirve.
  El motivo registrado fue que todo el plan se fijó antes de hablar con una imprenta y toda la configuración seguía provisional.
- Hoy, la propuesta de negocio concluye que ninguna opción probó que alguien pague.

La arquitectura describe cómo ejecutar un proyecto.
No tiene un paso que evalúe, al inicio, **si este proyecto necesita validación, cuánta y de qué tipo**, ni **cuánto arnés necesita**.
La decisión del 09-15 se tomó sin ese paso y se pagó con trabajo.

Dos matices para no sobrecorregir:
- Para un proyecto cuyo fin es aprender o armar portafolio, no validar es una elección razonable, y obligarlo a validar sería un costo.
- El error no fue elegir no validar; fue que nada del proceso obligaba a registrar por qué, ni definía cuándo reevaluarlo.

## 6. Propuesta: un proceso que decida, no una puerta que obligue

Chris descartó una puerta de validación fija y un arnés fijo: depende del proyecto.
Lo que falta es un paso de entrada que **decida** cuánta validación y cuánto arnés, y que vuelva a decidir cuando cambien las condiciones.
Es una hipótesis; no está probada, y conviene probarla en el siguiente proyecto antes de convertirla en software.

### 6.1 Una ficha de entrada, corta, que llena Chris con el agente

Se responde en una página, sin ejecutar nada.

1. **Para qué es el proyecto:** aprender, portafolio, cliente definido, o negocio propio.
2. **¿Alguien más lo va a usar o pagar?** Sí, no, o no sé.
3. **Cuánto cuesta equivocarse:** reversible, o con dinero, reputación o terceros de por medio.
4. **De qué depende el diseño que no está en el repositorio:** datos externos, personas que hay que consultar, normas. Se nombran.
5. **Tamaño esperado:** una tarde, semanas o meses.
6. **¿Hay trabajo que pueda correr en paralelo sin tocar los mismos archivos?** Sí o no.

### 6.2 De la ficha salen dos decisiones separadas

**Nivel de validación.**

| Nivel | Cuándo | Qué implica |
| --- | --- | --- |
| 0. Ninguna | Aprender o portafolio, y nadie más depende del resultado | Se registra por qué en una línea |
| 1. De escritorio | «No sé» si alguien lo usa, y el costo de error es bajo | Fuentes públicas y una propuesta con estados, como la de esta sesión |
| 2. Conversaciones | Alguien lo usará o pagará, y el diseño depende de personas | Entrevistas antes de construir lo que dependa de ellas |
| 3. Piloto | Hay dinero o terceros en juego | Un uso real acotado antes de escalar |

**Nivel de arnés.**

| Nivel | Cuándo | Qué incluye |
| --- | --- | --- |
| A. Ligero | Una tarde o pocas sesiones | Una sesión, instrucciones del repositorio, contrato de verificación |
| B. Con contexto | Semanas, un solo frente | Lo anterior más plan único y un `context/` |
| C. Con carriles | Dos frentes que de verdad corren en paralelo | Lo anterior más carriles, política de rutas y revisión cruzada |

PliegoStack se montó en el nivel C. La retrospectiva no puede decir si el nivel B habría bastado; sí que el C se pagó con trabajo de proceso que, medido en commits, pesó tanto como el producto.

### 6.3 Disparadores de reevaluación

La decisión de entrada no es definitiva.
Se vuelve a evaluar, y se registra, cuando ocurre alguno de estos:

- Una decisión de diseño depende de un dato que nadie ha confirmado, y el costo de equivocarse es alto. En PliegoStack, el 09-24, fue que todo `public/config/` seguía declarado `provisional`.
- Se va a construir una función que solo tiene sentido si alguien pagará por ella.
- Pasan más de dos semanas sin que el proyecto produzca algo que una persona ajena pueda usar o juzgar.
- Un carril o un nivel de arnés lleva más trabajo de coordinación que de producto en las últimas diez sesiones.

### 6.4 Lo que esto no es

- No es un formulario que bloquee el inicio. Si Chris lo responde «aprender, nadie más, una tarde», termina en un renglón.
- No sustituye el juicio de Chris: el agente propone, Chris decide, y se registra en una decisión de un párrafo.
- No debe automatizarse todavía. Sin un segundo proyecto no se sabe si las seis preguntas son las correctas.

## 7. Aprendizajes candidatos para la memoria global

Estos son candidatos; no los he registrado. Lo hace Chris, o una sesión de curación, con `record-learning.mjs`.

1. Una decisión de «no validar» se registra con su motivo y su disparador de reevaluación.
2. Un agente puede construir mucho sin que nadie le pregunte para quién; la pregunta de entrada debe ser parte del proceso, no del carácter del agente.
3. La ruta de carril con `~` no se expande; usar ruta absoluta, o avisar al declararla.
4. El estado de un panel de agente oscila; un monitor útil mira parada sostenida y ausencia de shell, no un estado puntual.
5. Verificar contra el sistema de registro funciona, pero solo si se hace después de cada «terminé»; es un costo del orquestador que hay que presupuestar.
6. Dos sesiones del mismo carril son seguras solo mientras una esté detenida.
7. El tope de revisión por rango y el baseline exclusivo de Chris hacen que acumular commits sin empujar tenga costo creciente.

## 8. Cabos sueltos

El estado «verificado» indica lo que comprobé hoy.
La última columna es una recomendación; la decisión es de Chris salvo que diga otra cosa.

| # | Cabo | Estado | Quién decide | Recomendación |
| --- | --- | --- | --- | --- |
| 1 | 39 commits sin empujar sobre `origin/master` | verificado; pre-push probablemente exige revisión, sin ejecutar | Chris | Decidir si empujar o archivar sin empujar. Si empuja, ver el tope de revisión y el baseline |
| 2 | Política del repositorio modificada y sin commit | verificado: `M` en `git status` | Chris | Corregir la ruta de borradores a absoluta o quitarla, y commitear, o descartar el cambio. Si el carril `research` se cierra, la ruta ya no sirve |
| 3 | Handoff `2026-09-25` sin seguimiento | verificado | Chris | Commitearlo o borrarlo; no lo toqué |
| 4 | Hoja de contactos `.xlsx` dentro de `docs/`, excluida solo por `.git/info/exclude` local | verificado: existe y está excluida localmente | Chris | Moverla fuera del repositorio. Verificar que cerraste el enlace público de la hoja: no puedo comprobarlo desde aquí |
| 5 | Cuatro borradores de contacto sin enviar, en `~/Documents/pliegostack/borradores/` | verificado: existen los de Moris y Ograma; los de Andros e Impressme no los releí hoy | Chris | Si pausas el proyecto, no enviar. Si prefieres enviar sin landing ni asistente, quitar la oferta de llamada telefónica antes |
| 6 | Dos sesiones `research` registradas (`d72808e3` detenida, `aec27339` terminada) y la mía sin carril | verificado con `session.mjs list` | Chris | Cerrar los paneles de las dos de `research` |
| 7 | `docs/PLAN.md` dice que UX-8 está en `integrate/build-20261002` pendiente de integrar | verificado: línea 44; la rama ya se integró (`4246d81`) y se borró | Chris o carril `build` | Corregir el estado; es un dato viejo del plan, no un error de código |
| 8 | `docs/PLAN.md` no refleja la pausa | verificado | Chris | Añadir una nota de pausa con el motivo, o decidir que el plan queda como está |
| 9 | Una URL del Ministerio de Educación lleva el apellido de un ministro en la ruta (`context/market/customers.md`, `printers.md`, `docs/research/2026-10-02-mercado-publico.md`) | verificado | Chris | `research` ofreció quitarlas. Es una fuente pública, no un contacto; decidir si importa |
| 10 | La propuesta de negocio no tiene aprobación explícita de Codex tras dos rondas, y se reemplazó «Chris» por «el dueño del proyecto» | verificado en el reporte de la sesión; no repetí la revisión | Chris | Aceptar así, o pedir una tercera ronda; devolver el nombre si prefieres |
| 11 | Plan de landing, dominio y asistente de correo aprobado y sin ejecutar; el archivo de plan está en `~/.claude/plans/` | verificado como no ejecutado; no verifiqué si compraste algún dominio | Chris | Cancelarlo. Si compraste un dominio, decidir si lo mantienes |
| 12 | Una decisión de pausa no está registrada en `docs/decisions/` | verificado | Chris, con el agente | Registrar la pausa y sus motivos con `record-decision.mjs --record-scope project` |
| 13 | Los aprendizajes de la sección 7 no están registrados globalmente | verificado | Chris o sesión de curación | Registrarlos como candidatos |
| 14 | Pendientes de investigación (SUP-1 a SUP-5, preguntas 1 a 15) quedan abiertos | verificado en `docs/PLAN.md` | Chris | Dejarlos abiertos y marcados como pausados |

## 9. Lo que no sé

- Cuánto costó el experimento en tiempo, tokens y dinero.
- Si habría salido mejor un arnés de nivel B.
- Si las seis preguntas de la ficha de entrada son las correctas; solo un segundo proyecto lo dirá.
- Si el filtro de carril se hace cumplir en la escritura de archivos dentro de Claude Code, más allá del commit.
- Si algún dato de la propuesta de negocio ha cambiado desde el 2026-10-03.

## 10. Qué haría con esto

- Cerrar los cabos del 1 al 8 y el 12, que son de orden, y decidir los demás.
- Probar la ficha de la sección 6.1 en el siguiente proyecto, con una regla: se llena antes del primer commit, y se reevalúa en los disparadores de 6.3.
- No construir herramientas para la ficha hasta que haya dos proyectos que la hayan usado.
