# 2026-10-03 — Propuesta de negocio para PliegoStack

> **Propuesta, no compromiso.**
> Este documento no cambia `docs/PLAN.md` ni `context/product/`.
> Lo que de aquí deba cambiar el producto lo decide el dueño del proyecto y lo promueve al plan.

Escrita por la sesión de investigación, sin contactar a nadie.
Lee lo que la investigación ya estableció en `context/market/` y en `docs/research/2026-10-02-*`, y añade fuentes públicas nuevas consultadas el 2026-10-03.

## Cómo leer los estados

Cada afirmación sobre el mercado lleva uno de tres estados:

- **[verificado]**: con fuente y fecha de consulta.
- **[inferencia]**: un razonamiento a partir de fuentes, que una entrevista o un experimento puede tumbar.
- **[desconocido]**: no se encontró, y se dice qué haría falta para saberlo.

Las afirmaciones sobre la herramienta se apoyan en `context/product/capabilities.md`, comprobado contra el código.
Ninguna cifra de la app es un dato de una imprenta: todos los archivos de `public/config/` declaran `provisional: true`.

## Resumen

PliegoStack hoy es una calculadora técnica de libro (lomo, peso, imposición por firmas, pliegos por ejemplar, tapa) que corre en el navegador con datos de ejemplo, y una ficha técnica imprimible.
No calcula costo, no tiene usuarios, no tiene datos de ninguna imprenta y no está desplegada en un sitio público que se haya verificado.
La investigación encontró que varias imprentas de Santiago ya ofrecen a su propio cliente un cotizador en línea, y que KDP regala una calculadora de lomo y tapa **[verificado]**; si eso resuelve el problema del cliente es **[desconocido]**.
La oportunidad menos refutada no es vender software a imprentas, sino servir el momento en que una editorial pequeña o un autor tiene que pedir cotizaciones comparables **[inferencia]**.
Ese momento tiene en Chile una forma concreta: la convocatoria 2027 del Fondo del Libro exige una cotización de impresión con las especificaciones técnicas de la publicación, y la de 2026 seleccionó 133 proyectos de edición **[verificado]**; cuántos postulan y si el volumen se repite cada año es **[desconocido]**.
La recomendación es probar primero esa opción como experimento barato y sin contacto, y no tratarla todavía como negocio: con lo que hay hoy, ninguna opción sobrevive con evidencia a la objeción de quién paga.

## 1. Qué ofrece PliegoStack hoy de verdad

### Lo que hace

- Especifica un libro en cinco pasos: formato y sangrado, papel interior y gramaje, páginas y encuadernación, imposición (pliego y prensa) y tapa.
- Rechaza un número de páginas que el método de encuadernación no admite, dice por qué y sugiere los dos valores válidos más cercanos.
- Calcula el lomo del papel y el lomo final con la encuadernación, el peso del interior y de la tapa, y la imposición por firmas: esquemas que caben, el que menos desperdicia, firmas por ejemplar, páginas en blanco, pliegos de prensa por ejemplar y si va con una plancha o con planchas separadas.
- Calcula el aprovechamiento geométrico del pliego, el corrimiento en los métodos que anidan hojas, la hoja de tapa blanda con solapas y las piezas de una tapa dura (cartones, lomo y forro).
- Dibuja la página, el lomo, el pliego por frente y dorso, y la tapa.
- Muestra una sección con las fórmulas, y cuando no puede calcular dice por qué en vez de dar un número.
- Exporta una ficha técnica imprimible del libro, que el navegador guarda como PDF, y que declara qué datos son de ejemplo y de dónde sale cada catálogo.
- Deja editar los catálogos de papeles, tapas, pliegos, prensas y encuadernaciones; lo editado se guarda solo en el navegador de quien lo hizo.

### Lo que no hace

- No calcula tirada, merma ni costo: no da un precio.
- No tiene datos de ninguna imprenta: todo lo que trae es de ejemplo.
- No genera un PDF de imposición, líneas de troquel ni nada que lea una máquina.
- No importa ni exporta los catálogos propios, no tiene cuentas ni servidor, y no recuerda el libro tras recargar.
- No calcula el peso del cartón de una tapa dura, ni sobrecubiertas, camisas o fajas.
- No impone varias firmas, o trabajos con páginas de distinto tamaño, en un mismo pliego.
- No ha sido usada por ninguna imprenta ni editorial: su usuario está sin caracterizar (`context/product/users.md`).

### Lo que eso significa como oferta

Hoy PliegoStack ofrece una respuesta técnica rápida y explicada a «qué libro estoy pidiendo y cuánto papel lleva cada ejemplar», no una respuesta a «cuánto me cuesta» ni a «cómo lo imprimo en mi máquina».
Esa diferencia es el centro de todo lo que sigue.

## 2. Problemas reales de la industria

### Lo que ya estableció la investigación (2026-10-02)

| Problema u observación | Estado | Fuente |
| --- | --- | --- |
| En Chile se registraron 10.376 títulos con ISBN en 2025, el 75,98 % en la Región Metropolitana. | verificado | Informe ISBN 2025, Cámara Chilena del Libro, consultado 2026-10-02 (`context/market/customers.md`) |
| La literatura infantil fue el 10,35 % de los títulos entre 2016 y 2025; no hay categoría «libro álbum». | verificado; usarla como aproximación del libro álbum es inferencia | Informe ISBN 2025, consultado 2026-10-02 |
| La tirada de 2025 «se concentra en el rango de 1 - 500 ejemplares», y la autoedición fue el 19,21 % de los títulos. | verificado | Informe ISBN 2025, consultado 2026-10-02 |
| Varias imprentas venden tiradas cortas con cotizador o configurador en línea: Donnebaum, ImprimeTuLibro e Impressme; Printech publica precios de referencia y responde cotizaciones en menos de 24 horas. | verificado | sitios de cada imprenta, consultados 2026-10-02 (`context/market/printers.md`) |
| El cotizador de Donnebaum ya muestra páginas por pliego y pliegos por ejemplar, con tapa dura, solapas y guardas. | verificado | donnebaum.com/cotizador-libros.html, consultado 2026-10-02 |
| Una preprensa de Santiago pedía conocer Preps, un programa comercial de imposición. | verificado el aviso; que la imprenta lo use hoy, desconocido | chiletrabajos.cl/trabajo/3864335, consultado 2026-10-02 |
| Andros publica reglas de archivo para el cliente (páginas múltiplo de 4, sangrado de 2 a 5 mm) y tablas de formatos por máquina. | verificado | andros.cl, consultado 2026-10-02 |
| ImprimeTuLibro declara que no trabaja con fondos concursables ni financiamiento público. | verificado | imprimetulibro.cl, consultado 2026-10-02 |
| Qué le molesta a una imprenta o a una editorial de su forma actual de preparar un libro. | desconocido: no se ve desde fuera; necesita entrevistas | `context/market/open-questions.md`, preguntas 5, 7 y 11 |

### Lo nuevo de esta sesión (2026-10-03)

| Problema u observación | Estado | Fuente |
| --- | --- | --- |
| El Fondo del Libro, línea Fomento a la Industria, convocatoria 2027, exige para los servicios de impresión «una cotización que avale la solicitud financiera, acorde al tipo de la edición postulada y dé cuenta de las especificaciones técnicas de la publicación», y una por título en las colecciones. | verificado | Bases Fomento a la Industria 2027, https://www.fondosdecultura.cl/wp-content/uploads/2026/07/fomento-industria-libro-2027.pdf, consultado 2026-10-03 |
| En las modalidades Apoyo a Ediciones y Emprendimiento, esas bases excluyen a las empresas que contemplen autoediciones o libros publicados a pedido, entendiendo autoedición como la coincidencia del autor y el representante legal de la editorial; la edición de libro experimental, de hasta 100 ejemplares, sí admite autopublicación. | verificado | mismas bases, consultado 2026-10-03 |
| Esa convocatoria dispone $850.000.000 para Apoyo a Ediciones, con un máximo de $7.000.000 por proyecto de libro único y $12.000.000 por colección. | verificado | mismas bases, consultado 2026-10-03 |
| La convocatoria 2026 seleccionó en esa línea 104 proyectos de libro único, 21 de colecciones y 8 de libro experimental: 133 proyectos de edición. | verificado por conteo propio de la nómina; el conteo sale del texto extraído del PDF y puede tener un error pequeño | Nómina de seleccionados 2026, https://www.fondosdecultura.cl/wp-content/uploads/2026/01/seleccionados-libro-2026-enero.pdf, consultado 2026-10-03 |
| Cuántos proyectos postulan, cuántos son libro álbum, y cuántas cotizaciones de imprenta se piden por proyecto. | desconocido: la nómina solo lista seleccionados; las postulaciones no se encontraron publicadas | — |
| El estudio del Ministerio de las Culturas sobre el mercado editorial 2019-2024 identificó 666 editoriales en el registro ISBN, con más del 65 % en el segmento de hasta 50 títulos, y constató la falta de datos sistematizados y confiables de producción y comercialización. | verificado | https://www.cultura.gob.cl/politicalibro/mincap-presenta-los-primeros-resultados-del-estudio-exploratorio-de-caracterizacion-del-mercado-editorial-2019-2024/, publicado 2025-01-23, consultado 2026-10-03 |
| El registro ISBN chileno es declarativo: la tirada la declara la editorial sin verificación. | verificado | CIPER, https://www.ciperchile.cl/2025/02/17/las-dificultades-para-caracterizar-el-mercado-editorial-en-chile-los-problemas-que-presenta-el-registro-de-isbn/, consultado 2026-10-03 |
| En 2021-2022 hubo en Chile escasez de papel para libros: la Cámara Chilena del Libro estimó hasta un 30 % menos de papel, y Editores de Chile habló de retrasos de hasta seis meses y alzas de 35 % a 40 %. | verificado para esa fecha; si persiste hoy, desconocido | T13, https://www.t13.cl/noticia/nacional/tendencias/precio-libros-podria-sufrir-fuerte-alza-escasez-papel-pais-02-03-2022, publicado 2022-03-02, consultado 2026-10-03 |
| En Latinoamérica se asignaron 317.312 ISBN en 2023; Chile, 9.298. Los autores-editores pidieron 50.139 ISBN en la región en 2023, y 1.503 en Chile. | verificado | Cerlalc, Panorama de la actividad editorial en América Latina 2019-2024, https://cerlalc.org/wp-content/uploads/2026/07/Panoram-de-la-actividad-editorial-2019-2024_Cerlalc_Agosto.pdf, consultado 2026-10-03 |
| Chile declaró 20.170.686 ejemplares en 2024, y Cerlalc atribuye los picos a tirajes del Estado. | verificado | Cerlalc, mismo informe, consultado 2026-10-03 |
| En Argentina, 2025 tuvo el récord de títulos (36.942) y la menor tirada total desde 2016 (34,6 millones de ejemplares contra 52,6 millones en 2024); casi 1 de cada 4 novedades declara menos de 600 ejemplares. | verificado | Chequeado, con datos de la Cámara Argentina del Libro, https://chequeado.com/el-explicador/feria-del-libro-2026-se-publican-mas-titulos-pero-cae-fuerte-la-cantidad-de-ejemplares-impresos/, publicado 2026-04-24, consultado 2026-10-03 |
| Imprimir libros ilustrados a color en China es más barato, y trae retrasos de aprobación y restricciones de contenido. | verificado para editoriales de habla hispana en 2019; si editoriales chilenas de libro álbum imprimen afuera, desconocido | Publishnews, https://publishnews.es/imprimir-en-china-lo-barato-puede-salir-caro/, publicado 2019-03-05, consultado 2026-10-03 |

### Lo que se puede decir de los problemas

- En Argentina hay más títulos con menos ejemplares: récord de títulos y la menor tirada total desde 2016 en 2025 **[verificado]**.
- En Chile la tirada de 2025 se concentra en 1 a 500 ejemplares, la autoedición es casi un quinto de los títulos y más del 65 % de las editoriales del estudio del Ministerio está en el segmento de hasta 50 títulos **[verificado]**; si en Chile las tiradas bajan con el tiempo, **[desconocido]**.
- Que la tendencia argentina valga para Chile o para la región es **[inferencia]**.
- Un libro de tirada corta hace que la preparación técnica pese más por ejemplar, y que la persona que lo encarga tenga menos oficio que una editorial grande.
  **[inferencia]**
- La convocatoria 2027 del Fondo del Libro exige una cotización de impresión con especificaciones técnicas antes de saber si el proyecto se financia, y en 2026 se seleccionaron 133 proyectos de edición **[verificado]**.
  Cuántos postulan, y si ese volumen se repite cada año, es **[desconocido]**; que pedir esas cotizaciones sea un dolor para quien postula es **[inferencia]**.
- Si las editoriales de libro álbum tienen problemas de retrabajo por cifras técnicas equivocadas (lomo, tapa, páginas en blanco), no se encontró ninguna fuente pública.
  **[desconocido]**

## 3. Oportunidades de mercado

### Segmentos

| Segmento | Quién paga | Cuánto duele | Qué usan hoy |
| --- | --- | --- | --- |
| Imprentas industriales (A Impresores, Ograma, Andros, Portal Gráfico) | La imprenta, si compra software | Bajo para lo que PliegoStack hace: tienen preprensa con oficio y probablemente software de imposición. **[inferencia]** | Software de imposición y preprensa (Preps aparece en un aviso de Santiago **[verificado]**); MIS o planilla propia **[desconocido]** |
| Imprentas digitales y de tirada corta (Donnebaum, ImprimeTuLibro, Impressme, Printech, CIPOD) | La imprenta | Medio: cotizan mucho y de poco valor cada uno. **[inferencia]** | Cotizador o configurador en línea propio en Donnebaum, ImprimeTuLibro e Impressme **[verificado]**; en Printech, precios de referencia y cotización en menos de 24 horas **[verificado]**; en CIPOD, **[desconocido]**; revisión de archivo manual **[verificado en Printech e ImprimeTuLibro]** |
| Editoriales independientes y de libro ilustrado (12 en la categoría «Ilustración» de Editoriales de Chile **[verificado]**) | La editorial, o el Fondo del Libro indirectamente | Desconocido: no hay fuente pública sobre su proceso. **[desconocido]** | Cotizaciones por correo o formulario a imprentas, diseño en InDesign **[inferencia]** |
| Autores independientes y autoeditores (1.993 títulos en Chile en 2025 **[verificado]**) | El autor | Alto en desconocimiento técnico, bajo en presupuesto. **[inferencia]** | Cotizadores de imprentas, calculadora gratuita de KDP **[verificado]**; otras calculadoras **[desconocido]** |
| Diseñadores e ilustradores que diagraman libros | El diseñador, o su cliente | Medio: el lomo y la tapa son su entregable. **[inferencia]** | Plantillas de la imprenta (Impressme da plantillas **[verificado]**), calculadora de KDP **[verificado]** |
| Distribuidores de papel (Papeles Omega, Diazol) | El distribuidor, como marketing | Bajo. **[inferencia]** | Catálogos en línea **[verificado]** |
| Editoriales que postulan al Fondo del Libro (133 proyectos de edición seleccionados en 2026 **[verificado]**; sin autoediciones en Apoyo a Ediciones, salvo libro experimental **[verificado]**) | El postulante; quizás el propio fondo, como gasto de operación o de personal **[inferencia por confirmar en las bases]** | Probablemente alto en plazo: necesitan cotizaciones antes de una fecha. **[inferencia]** | Pedir cotizaciones a varias imprentas **[inferencia]**; algunas imprentas no les cotizan (ImprimeTuLibro **[verificado]**) |

### Competidores y sustitutos

| Sustituto | Qué hace | Por qué compite con PliegoStack | Estado |
| --- | --- | --- | --- |
| Cotizador en línea de una imprenta | Precio y, en Donnebaum, pliegos por ejemplar, para su propio cliente. | Ofrece precio, gratis y con los datos de la propia imprenta **[verificado]**; si eso basta al cliente, **[desconocido]**. | verificado, 2026-10-02 |
| Calculadora de tapa de KDP | Gratis; con tamaño, páginas, papel y encuadernación da medidas de tapa y lomo, y una plantilla en PDF y PNG. | Comoditiza el lomo y la tapa para autoeditores. | verificado, https://kdp.amazon.com/en_US/cover-calculator, consultado 2026-10-03 |
| Generador de plantillas de IngramSpark y calculadoras genéricas | Lomo, sangrado y plantillas, con los papeles de cada plataforma. | Lo mismo, para otras plataformas. | **[desconocido]**: aparecieron en un buscador el 2026-10-03, y la página de IngramSpark respondió 403 al abrirla |
| PressCal | Software en la nube para imprentas pequeñas y medianas: presupuesto, cotización, vista de imposición y seguimiento de trabajos, desde 49 € con precio plano. | Es lo que sería PliegoStack como SaaS para imprentas, con costo incluido. | verificado, https://www.capterra.co.uk/software/1109734/PressCal, consultado 2026-10-03 |
| MIS de imprenta (Tharstern, PrintVis y otros) | Presupuesto, planificación y producción; PrintVis declara desde 60 dólares por usuario al mes. | Una imprenta mediana que cotiza en serio podría ya estar aquí o en una planilla **[inferencia]**. | verificado en Capterra, https://www.capterra.com/p/154503/PrintVis/, consultado 2026-10-03; cuántas imprentas chilenas usan un MIS, **[desconocido]** |
| Software de imposición (Preps y otros) | Imposición real sobre el PDF, para la preprensa. | PliegoStack no genera un PDF impuesto, así que no lo reemplaza. | Preps verificado en un aviso de Santiago; sus precios no se verificaron en fuente primaria: **[desconocido]** |
| Hoja de cálculo de la imprenta | Lo que cada taller tenga. | Gratis y hecha a su medida. | **[desconocido]**: no se ve desde fuera |
| Calculadora de un proveedor de papel | — | — | No se encontró una en los dos distribuidores consultados: **[desconocido]** |
| Impresión bajo demanda (KDP, IngramSpark, Lulu, Bookvault) | Imprimen y distribuyen, con su calculadora. | Para el autor que acepta su catálogo de formatos, el problema técnico desaparece. | KDP verificado (su calculadora); IngramSpark, Lulu y Bookvault, **[desconocido]**: solo resultados de buscador del 2026-10-03; si imprimen en Chile o cuánto cuesta el envío, **[desconocido]** |

### Por qué PliegoStack podría no tener negocio

Estas objeciones se buscaron a propósito.

1. **El cotizador de la imprenta ya lo resuelve.**
   Para el cliente de Donnebaum, ImprimeTuLibro o Impressme, el precio y las reglas del producto vienen en el mismo formulario, gratis.
   **[verificado que existen; que basten al cliente, desconocido]**
2. **La imprenta no necesita la calculadora.**
   Una imprenta con preprensa ya calcula firmas y pliegos con oficio o con software de imposición, y lo que no tiene resuelto, si algo, es el costo, que PliegoStack decidió no calcular.
   **[inferencia]**
3. **El usuario que más la necesita no paga.**
   Autores y microeditoriales tienen poco presupuesto, y las calculadoras de lomo y tapa son gratis.
   **[inferencia, apoyada en la existencia verificada de calculadoras gratuitas]**
4. **El mercado es pequeño.**
   Chile registra unos 10.000 títulos al año, y la literatura infantil es una décima parte; el libro álbum es un subconjunto sin cifra propia.
   Un SaaS de nicho en Chile solo no parece sostener un negocio.
   **[cifras verificadas; la conclusión es inferencia]**
5. **Sin datos reales, la cifra no vale.**
   Todo lo que PliegoStack muestra es de ejemplo, y ninguna imprenta ha dicho que entregaría sus datos.
   **[verificado en el repositorio; la disposición de las imprentas, desconocida]**
6. **El libro álbum chileno podría imprimirse fuera.**
   Si las editoriales de libro ilustrado imprimen en Asia, la imprenta local no es el cliente.
   **[desconocido]**

## 4. Opciones de negocio

Las seis opciones son distintas en quién paga y qué se vende.
Todas se evalúan con los mismos criterios.

### A. Ficha para cotizar: especificar una vez, pedir cotizaciones comparables

- **A quién sirve**: en primer lugar, editoriales pequeñas que postulan al Fondo del Libro; los autoeditores y diseñadores son una hipótesis aparte, porque las bases excluyen la autoedición de Apoyo a Ediciones y su forma de cotizar no está verificada.
- **Qué vende**: una ficha técnica neutral, sin imprenta asignada, que se manda igual a varias imprentas para que las cotizaciones sean comparables.
- **Qué hay que construir**: un incremento pequeño, pero no nulo.
  La ficha exportable de hoy (UX-8) incluye prensa, pliego y esquema de imposición, y sale de catálogos de ejemplo; para ser neutral necesita un modo sin prensa ni pliego, que pida solo lo que una imprenta necesita para cotizar.
  Ese modo es una propuesta que el dueño del proyecto tendría que promover al plan; no existe hoy.
- **Datos reales que necesita**: qué campos pide una imprenta para cotizar; ya hay formularios públicos descritos en `context/market/references.md` (REF-4, REF-9, REF-10, REF-13) y el de Moris en `printers.md`.
  Sin datos de imprenta, son seguros el formato, el sangrado y si el número de páginas es válido para la encuadernación; el lomo, el peso y las medidas de tapa dependen del espesor y el gramaje de un papel de ejemplo, así que en la ficha neutral irían como estimación declarada, o se omitirían hasta que la imprenta elegida los confirme.
- **Modelo de ingresos**: ninguno al inicio; después, gratis para el editor y pagado por la imprenta que recibe el pedido (lleva a la opción C), o como puerta de entrada a la opción E.
- **Riesgo**: alto en ingresos, bajo en técnica.
  Si el editor no tiene problema en llenar cinco formularios distintos, no hay valor.
- **Costo de probarla**: muy bajo.

### B. SaaS de presupuesto técnico para imprentas de tirada corta

- **A quién sirve**: imprentas digitales y de tirada corta que cotizan muchos libros pequeños.
- **Qué vende**: perfiles de máquina y pliego, imposición, pliegos por ejemplar y ficha técnica, con suscripción mensual.
- **Qué hay que construir**: tirada, merma y costo (hoy no objetivo cerrado hasta hablar con una imprenta), servidor y cuentas (hoy segunda etapa), importación de catálogos, y datos reales por imprenta.
- **Datos reales que necesita**: máquinas, pliegos, papeles, precios y mermas de cada imprenta cliente.
- **Modelo de ingresos**: SaaS por imprenta.
- **Riesgo**: alto.
  Compite con PressCal y con los MIS, que ya traen costo **[verificado]**, y con el cotizador propio que varias imprentas ya tienen **[verificado]**.
  Cuántas imprentas de libros hay en Santiago es **[desconocido]**: la lista de prospectos no es un censo, así que el tamaño del mercado de B no se puede estimar hoy.
- **Costo de probarla**: alto: necesita una imprenta dispuesta a entregar datos y precios.

### C. Mercado de cotizaciones: un pedido, varias imprentas

- **A quién sirve**: del lado del comprador, editoriales y autores; del lado del vendedor, imprentas que quieren trabajo de tirada corta.
- **Qué vende**: pedidos calificados, con la ficha técnica ya resuelta.
- **Qué hay que construir**: sobre A, un registro de imprentas, el envío del pedido, y un servidor.
- **Datos reales que necesita**: qué imprentas aceptan qué trabajos (formatos, encuadernaciones, tiradas, si aceptan proyectos con fondos públicos).
- **Modelo de ingresos**: comisión por pedido o suscripción de la imprenta.
- **Riesgo**: alto.
  Es un mercado de dos lados que necesita volumen en ambos, y el volumen de Chile probablemente es pequeño para eso **[inferencia, a partir de las cifras ISBN verificadas]**.
  Las imprentas pueden no querer competir por precio en una vitrina común **[inferencia]**.
- **Costo de probarla**: medio, y probarla bien exige contactar imprentas, que esta propuesta no hace.

### D. Licencia del motor o componente embebible

- **A quién sirve**: una imprenta con tienda en línea, o una plataforma de impresión, que quiere un configurador con reglas técnicas correctas.
- **Qué vende**: los motores de `src/engine/` (puros y probados) como librería o componente para el sitio de un tercero.
- **Qué hay que construir**: empaquetar los motores como librería con API estable, documentación y licencia.
- **Datos reales que necesita**: los del licenciatario, que él mismo carga.
- **Modelo de ingresos**: licencia anual o por integración.
- **Riesgo**: medio-alto.
  Las imprentas con cotizador ya lo construyeron **[verificado]**, y las que no lo tienen quizá no tienen equipo para integrarlo **[inferencia]**.
  Es un negocio de pocos clientes y ventas largas.
- **Costo de probarla**: bajo para preparar una demostración, alto para vender.

### E. Servicio de ingeniería de producción editorial

- **A quién sirve**: editoriales pequeñas, autoeditores y postulantes a fondos que no tienen un productor gráfico.
- **Qué vende**: un servicio por libro: ficha técnica, comparación de cotizaciones, revisión de archivo y de tapa, y acompañamiento hasta la imprenta; PliegoStack es la herramienta interna, no el producto.
- **Qué hay que construir**: nada de software para empezar; una página que describa el servicio.
- **Datos reales que necesita**: las cotizaciones reales que cada cliente obtenga, que con el tiempo forman la base de datos que hoy falta.
- **Modelo de ingresos**: precio por proyecto.
  Si el Fondo del Libro puede financiar ese servicio como gasto de operación o de personal es una pregunta abierta: las bases admiten cotizaciones de «servicios de edición» y de honorarios **[verificado]**, pero que admitan este servicio en particular es **[inferencia]**.
- **Riesgo**: medio.
  No escala como software y depende del tiempo de quien lo preste; pero es la única opción donde alguien paga por el resultado desde el primer cliente **[inferencia]**.
- **Costo de probarla**: bajo en construcción; venderla exige contacto, que decide el dueño del proyecto.

### F. Plantillas de tapa y lomo por imprenta chilena

- **A quién sirve**: diseñadores, ilustradores y autoeditores que diagraman para una imprenta local.
- **Qué vende**: lo que KDP regala para su plataforma, pero con los papeles, encuadernaciones y reglas de las imprentas chilenas: medidas de tapa y plantilla descargable.
- **Qué hay que construir**: exportar la tapa como plantilla (hoy solo la dibuja), y datos de papeles y encuadernaciones por imprenta.
- **Datos reales que necesita**: espesor de papel y aporte de encuadernación de cada imprenta; sin ellos, la plantilla puede estar equivocada, y el principio del producto es no inventar.
- **Modelo de ingresos**: gratis como atracción, o patrocinado por la imprenta cuyas plantillas aparecen.
- **Riesgo**: medio en uso, alto en ingresos; el sustituto gratuito existe **[verificado]**.
- **Costo de probarla**: bajo en construcción, pero depende de datos de imprentas que no se tienen.

### Comparación

| Criterio | A. Ficha para cotizar | B. SaaS imprentas | C. Mercado | D. Licencia motor | E. Servicio | F. Plantillas |
| --- | --- | --- | --- | --- | --- | --- |
| Quién paga | Nadie al inicio | Imprenta | Imprenta o editor | Imprenta o plataforma | Editor o autor | Nadie, o imprenta patrocinadora |
| Evidencia de dolor | Requisito del Fondo del Libro **[verificado]**; dolor **[inferencia]** | **[desconocido]** | **[desconocido]** | **[desconocido]** | **[inferencia]** | Sustituto gratis **[verificado]** |
| Construir sobre lo actual | Poco: un modo neutral de la ficha | Mucho: costo, servidor, datos | Mucho: servidor, dos lados | Medio: empaquetar | Nada | Poco más datos |
| Datos reales necesarios | Campos de cotización (públicos) | Precios y máquinas por imprenta | Capacidades de imprentas | Del licenciatario | Los del cliente | Papeles por imprenta |
| Competencia | Formularios de cada imprenta | PressCal, MIS, cotizadores propios | Contacto directo editor-imprenta | Cotizadores ya construidos | Imprentas que asesoran gratis **[inferencia]** | KDP; otras plataformas **[desconocido]** |
| Riesgo | Alto en ingresos, bajo en técnica | Alto | Alto | Medio-alto | Medio | Alto en ingresos |
| Costo de probar sin contactar a nadie | Muy bajo | No se puede sin una imprenta | No se puede sin imprentas | Bajo, solo la demo | Bajo, solo la página | Bajo, pero sin datos reales |

## 5. Visión

**Una frase.**
PliegoStack aspira a ser una forma rápida de saber, antes de pedir una cotización, qué libro se está pidiendo exactamente y qué consecuencias técnicas tiene cada decisión.
Es una visión: depende del modo neutral de la ficha propuesto en la opción A, que no existe hoy.

**Para quién.**
Para quien encarga un libro ilustrado de tirada corta sin un productor gráfico al lado: una editorial pequeña, un autor que se autoedita, un diseñador, o quien postula a un fondo.
La imprenta es destinataria de la ficha, no el usuario que paga, mientras no haya evidencia de lo contrario.

**El cambio que produce.**
Que el pedido llegue a la imprenta completo, coherente y comparable, y que el editor entienda por qué una página más o un papel distinto cambian el lomo, los pliegos y la tapa.

**Qué no será.**
- No será un software de imposición ni de preprensa: no reemplaza a Preps ni genera PDF para la máquina.
- No será un MIS ni un sistema de gestión de imprenta.
- No será un cotizador de precio mientras no haya precios reales de una imprenta.
- No será una imprenta ni una plataforma de impresión bajo demanda.

**Cómo se ve en 12 meses si funciona.**
Esto es una hipótesis de éxito, no una previsión.
- Hay una versión pública de la ficha para cotizar, usada por editores y autores reales, con una medición de cuántas fichas se exportan.
- Un grupo de postulantes la usó en una convocatoria del Fondo del Libro para pedir cotizaciones.
- Hay al menos una imprenta que recibe fichas de PliegoStack y dice si le sirven, y al menos una que entregó sus datos reales de papeles y encuadernaciones.
- Hay una forma de ingreso probada con al menos un pago real, sea por servicio (E) o por pedido (C); si no la hay, se sabe por qué.
- Los supuestos `SUP-1` a `SUP-5` están respondidos.

## 6. Recomendación

### Qué elegir primero

**La opción A, ficha para cotizar, como experimento de demanda, con la opción E como la vía de ingreso que se prueba si A muestra demanda.**

Por qué:

- Es la única opción con un momento de uso verificado en una fuente: la cotización con especificaciones técnicas que exige la convocatoria 2027 del Fondo del Libro, cuya convocatoria 2026 seleccionó 133 proyectos de edición **[verificado]**.
  Que ese momento se repita con un volumen parecido cada año es **[desconocido]**.
- Parte de lo que ya existe: la ficha técnica exportable está cerrada en `95a9c86`, aunque para ser neutral necesita el modo sin prensa ni pliego descrito en la opción A.
- Su versión neutral no necesita los datos de máquina de una imprenta, que son el bloqueo de B, C y F; sí depende de un papel de ejemplo para el lomo y la tapa, que debe ir declarado como estimación.
- No compite de frente con el cotizador de cada imprenta, que sirve para una imprenta, mientras la ficha sirve para comparar varias **[inferencia]**.
- Es la más barata de probar, y los experimentos de abajo no contactan a nadie.

Cómo sobrevive a las objeciones:

| Objeción | ¿Sobrevive? |
| --- | --- |
| El cotizador de la imprenta ya lo resuelve. | En parte: lo resuelve para una imprenta, no para comparar varias. Si el editor no compara, no sobrevive. |
| La imprenta no la necesita. | Sí: A no le vende a la imprenta. |
| El usuario no paga. | **No sobrevive con evidencia.** A no tiene ingresos; por eso E es la prueba de ingreso, y si nadie paga por E, no hay negocio con este usuario. |
| El mercado es pequeño. | **Sobrevive solo como experimento.** 133 proyectos seleccionados en 2026 no sostienen una empresa. El Fondo sirve como cuña para editoriales elegibles, no para autoeditores, que las bases excluyen de Apoyo a Ediciones **[verificado]**. La apuesta de crecer es una hipótesis distinta **[inferencia]**: que un momento parecido de pedir cotizaciones exista en la autoedición chilena (1.993 títulos en 2025 **[verificado]**, con un proceso de cotización no verificado) y en países como Argentina, donde las tiradas bajan **[verificado]**. |
| Sin datos reales la cifra no vale. | En parte: la ficha neutral describe el libro sin datos de máquina, pero el lomo y la tapa siguen dependiendo de un papel de ejemplo hasta que una imprenta lo confirme. |
| El libro álbum se imprime fuera. | **[desconocido]**, y ninguno de los tres experimentos lo responde. Se puede acotar sin contactar a nadie leyendo el colofón («impreso en») de libros álbum chilenos en catálogos y vistas previas públicas; queda como tarea de investigación aparte. |

Lo honesto es decir que hoy no hay una opción que haya probado que alguien paga.
La recomendación no es «este es el negocio», sino «esta es la apuesta más barata para saber si hay uno».

### Los tres experimentos más baratos, sin contactar a nadie

**Experimento 1. Auditoría de sustitutos con cinco libros tipo.**
- Supuesto que prueba: que un editor no puede obtener hoy, gratis y en un solo lugar, una especificación técnica comparable entre imprentas.
- Cómo: definir cinco libros álbum tipo (por ejemplo, 32 páginas en tapa dura, 24 en tapa blanda con solapas, formato cuadrado y apaisado), y pasarlos por los cotizadores instantáneos públicos (Donnebaum, ImprimeTuLibro, Impressme), por la calculadora de KDP y por PliegoStack.
  Anotar qué entrega cada uno, qué formatos y encuadernaciones rechaza, y qué le falta al editor para comparar.
  No enviar ningún formulario que llegue a una persona.
- Costo: unas horas.
- Resultado que mata A: si los cotizadores públicos ya aceptan esos cinco libros y entregan especificación y precio comparables.

**Experimento 2. Tamaño del momento «cotizar para postular».**
- Supuesto que prueba: que el Fondo del Libro genera cada año suficientes proyectos de libro ilustrado que necesitan cotizaciones.
- Cómo: leer las nóminas de seleccionados de 2024, 2025 y 2026 y clasificar por título los proyectos de edición que son infantiles o ilustrados, por región; revisar en las bases qué especificaciones exige la cotización y si los gastos de servicios de edición o de producción son financiables.
  Revisar si el fondo publica las listas de postulantes o de inadmisibles, que darían el tamaño real.
- Costo: medio día.
- Resultado que mata A como cuña: menos de 20 proyectos infantiles o ilustrados seleccionados al año en promedio, o que las bases no pidan especificaciones que la ficha cubra.
  El umbral es un criterio fijado de antemano para que el resultado no se reinterprete después, no un cálculo económico: con menos de dos casos al mes, el Fondo no da volumen ni para aprender en un año.

**Experimento 3. Demanda de búsqueda, y una página de puerta falsa si el dueño del proyecto la aprueba.**
- Supuesto que prueba: que hay gente buscando resolver esto por su cuenta.
- Cómo: medir en Google Trends y en el planificador de palabras clave el volumen en Chile y en la región de búsquedas como «cotizar impresión libro», «calcular lomo libro», «imprimir libro álbum» y «cotización imprenta fondo del libro», y, para comparar, búsquedas de servicio como «asesoría impresión libro».
  Si el dueño del proyecto decide publicar la landing, que tenga un solo llamado a la acción (exportar una ficha para cotizar) y se mida solo con tráfico orgánico, sin anuncios ni mensajes a nadie.
- Costo: unas horas para las búsquedas; la landing, lo que decida el dueño del proyecto.
- Resultado que mata A, con umbrales fijados de antemano y a criterio, no derivados de un modelo de ingresos:
  - En las búsquedas: que el planificador muestre para todas esas búsquedas juntas un volumen mensual en Chile del orden de decenas, no de cientos.
  - En la landing: no juzgarla antes de 200 sesiones orgánicas que lleguen desde búsquedas relacionadas con imprimir o cotizar un libro; con esas sesiones, matar A si menos del 2 % exporta una ficha.
  - Si en ocho semanas no llega a 200 sesiones, el resultado es «sin tráfico», que dice algo de la distribución y no de la demanda, y no se usa para matar A.

### Señales para abandonar o girar

- **Abandonar A** si el experimento 1 muestra que los cotizadores públicos ya dan especificaciones comparables, o si el 2 y el 3 no muestran un momento de uso de tamaño razonable.
- **Girar a E (servicio)** no se puede decidir con estos tres experimentos, que no miden si alguien prefiere un servicio a usar la herramienta.
  Una señal indirecta sería que en el experimento 3 dominen búsquedas de servicio («quién me ayuda a imprimir un libro», «asesoría impresión libro») sobre las de cálculo; la prueba real exige ofrecer el servicio a personas, y eso lo autoriza el dueño del proyecto.
- **Girar a B (SaaS para imprentas)** solo si las entrevistas de la ronda de Santiago muestran que una imprenta quiere la herramienta y entrega sus datos y sus precios; sin eso, B es construir a ciegas, lo mismo que la decisión del 2026-09-24 quiso evitar.
- **Girar a D (licencia)** si una imprenta o plataforma pide el motor para su propio configurador.
- **Detener el proyecto como negocio** si ni A ni E encuentran usuarios, y la ronda de imprentas no encuentra una que quiera la herramienta: queda como herramienta de portafolio, que también es un resultado válido.

### Supuestos para llevar a una imprenta real

Estos supuestos de la propuesta solo los responde una imprenta, y van a la investigación:

- Si una imprenta acepta, o incluso prefiere, una ficha técnica externa en vez de su propio formulario.
- Si una imprenta cotiza proyectos con fondos públicos, y qué le falta a los pedidos que recibe.
- Qué software usa para cotizar e imponer, y si le falta algo que PliegoStack haga.

## Fuentes nuevas de esta sesión

Todas consultadas el 2026-10-03.

- Bases Fomento a la Industria 2027, Fondo del Libro: https://www.fondosdecultura.cl/wp-content/uploads/2026/07/fomento-industria-libro-2027.pdf
- Nómina de seleccionados 2026, Fondo del Libro: https://www.fondosdecultura.cl/wp-content/uploads/2026/01/seleccionados-libro-2026-enero.pdf
- Ministerio de las Culturas, estudio de caracterización del mercado editorial 2019-2024: https://www.cultura.gob.cl/politicalibro/mincap-presenta-los-primeros-resultados-del-estudio-exploratorio-de-caracterizacion-del-mercado-editorial-2019-2024/
- CIPER, sobre el registro ISBN: https://www.ciperchile.cl/2025/02/17/las-dificultades-para-caracterizar-el-mercado-editorial-en-chile-los-problemas-que-presenta-el-registro-de-isbn/
- T13, escasez de papel: https://www.t13.cl/noticia/nacional/tendencias/precio-libros-podria-sufrir-fuerte-alza-escasez-papel-pais-02-03-2022
- Cerlalc, Panorama de la actividad editorial en América Latina 2019-2024: https://cerlalc.org/wp-content/uploads/2026/07/Panoram-de-la-actividad-editorial-2019-2024_Cerlalc_Agosto.pdf
- Chequeado, producción editorial argentina 2025: https://chequeado.com/el-explicador/feria-del-libro-2026-se-publican-mas-titulos-pero-cae-fuerte-la-cantidad-de-ejemplares-impresos/
- Publishnews, imprimir en China: https://publishnews.es/imprimir-en-china-lo-barato-puede-salir-caro/
- KDP, calculadora de tapa: https://kdp.amazon.com/en_US/cover-calculator
- Capterra, PressCal: https://www.capterra.co.uk/software/1109734/PressCal
- Capterra, PrintVis: https://www.capterra.com/p/154503/PrintVis/

De las nóminas del Fondo del Libro no se tomó ningún nombre de persona: solo se contaron proyectos por modalidad.
