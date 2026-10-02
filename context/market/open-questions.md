# Preguntas de mercado abiertas

Lo que la investigación tiene que responder, ordenado por qué decisión de producto depende de la respuesta.
La investigación es sobre Santiago de Chile.
Cuando una pregunta se responde, la respuesta va a un archivo de esta carpeta con su fuente y su fecha de consulta, y aquí se marca como respondida con un enlace.

## A quién le sirve

1. Qué tipos de imprenta, de editorial y de otro actor del libro álbum tienen el problema que PliegoStack resuelve.
    Estado al 2026-10-02: Parcial, sin cerrar: las imprentas de la ronda van de plantas industriales a talleres por demanda (`printers.md`), y hay editoriales de libro ilustrado (`customers.md`); quién tiene el problema solo lo dice una entrevista.
2. De qué tamaño son y cuántos hay, con fuente.
    Estado al 2026-10-02: Parcial: la literatura infantil fue el 10,35 % de los títulos con ISBN entre 2016 y 2025 (`customers.md`); no hay cifra de imprentas ni de editoriales de libro álbum en Santiago.
3. Dónde la herramienta encaja y dónde no: para qué tipo de trabajo, para qué tipo de taller.
    Estado al 2026-10-02: Parcial, con inferencias por confirmar en cada imprenta de `printers.md`.
4. Quién es, dentro de cada uno, la persona que usaría la herramienta, y qué decisión toma con ella.
    Estado al 2026-10-02: Parcial: un aviso de empleo de AYC Impresores asigna la imposición y el montaje según formato de máquina al operador de preprensa, y otro de LOP Impresores pedía a ese operador conocer Preps (`current-practice.md`); en una editorial, y qué decide con la herramienta, se pregunta en entrevista.
5. Si lo que PliegoStack calcula es el cuello de botella real de quien prepara un libro, o si lo es otra cosa.
    Estado al 2026-10-02: Sin respuesta: necesita entrevistas.

## Cómo lo resuelven hoy

6. Con qué lo hacen: hojas de cálculo, software de imposición, calculadoras del proveedor de papel, la experiencia de un operador, o nada.
    Estado al 2026-10-02: Parcial, con fuente: `current-practice.md`.
7. Qué les molesta o les cuesta de eso.
    Estado al 2026-10-02: Sin respuesta: lo que les molesta no se ve desde fuera; se pregunta en entrevista.
8. Qué hace la herramienta cuando el taller ya tiene un RIP o un software de imposición: convive con él, le exporta, o compite.
    Estado al 2026-10-02: Parcial, como inferencia por confirmar: `current-practice.md`.
9. Cuánto les importa poder llevar el resultado a otra herramienta o a otra persona.
    Estado al 2026-10-02: Parcial, como inferencia por confirmar: `current-practice.md`.

## Clientes y editoriales

10. Cómo prepara una editorial o un autor un libro álbum para imprimir, y con quién lo coordina.
    Estado al 2026-10-02: Sin respuesta: cómo prepara una editorial un libro álbum no aparece en fuentes públicas; necesita hablar con editoriales. `customers.md` anota un caso de editorial e imprenta del mismo grupo, que no lo responde.
11. Qué errores o retrabajos sufre en ese camino por no tener estas cifras a tiempo.
    Estado al 2026-10-02: Sin respuesta: necesita hablar con editoriales.
12. Si le serviría usar la herramienta directamente, o solo recibir su resultado de una imprenta.
    Estado al 2026-10-02: Sin respuesta: necesita hablar con editoriales.

## Los datos

13. Qué imprentas entregarían los datos reales de su máquina, de sus pliegos, de sus papeles, de sus encuadernaciones y de sus tapas, y en qué forma.
    Estado al 2026-10-02: Parcial: Andros publica tablas por máquina y por pliego (`printers.md`), una forma en que una imprenta ya muestra sus datos; si alguna entregaría los de sus máquinas, papeles, encuadernaciones y tapas no está verificado, y hay que preguntarlo.
14. Qué formatos de pliego y qué prensas son usuales en Santiago, y si los datos públicos de los fabricantes coinciden con lo que las imprentas usan.
    Estado al 2026-10-02: Parcial, con fuente: `sheet-formats.md`, incluida una comparación con un fabricante que muestra cifras del mismo orden; los formatos usuales de Santiago y el modelo exacto de cada prensa necesitan a las imprentas.
15. Cuánta confianza ponen en una cifra mientras sus datos no sean los de su imprenta.
    Estado al 2026-10-02: Sin respuesta: necesita entrevistas.

## Los cinco supuestos del oficio

Son el cuestionario de la primera entrevista con una imprenta.
Cada uno está explicado en `../domain/` con su estado.

16. **SUP-1.** La densidad del cartón de una tapa dura, para poder calcular su peso.
17. **SUP-2.** Las tolerancias con que el cartón encaja en el forro en una tapa dura.
18. **SUP-3.** Dónde cae el sangrado en una tapa blanda con solapas.
19. **SUP-4.** Si el corrimiento se cuenta siempre en grupos de cuatro páginas, o depende del tamaño de la firma que se anida.
20. **SUP-5.** Cuál de los dos dobleces se salta una imprenta para hacer una firma de ocho páginas.

## Lo que ya se construyó

21. Qué de lo ya construido sobra, y qué falta, a la luz de las respuestas anteriores.
22. Si el cálculo de tirada, merma y costo es lo que más piden, y de qué datos depende.
