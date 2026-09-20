# Medios virales: qué partido beneficia cada medio

Análisis de los **20.404 tuits con más de 100 retuits** publicados por los medios generalistas españoles entre el **19 de septiembre de 2025 y el 19 de septiembre de 2026**, clasificados uno a uno por el partido al que afectan y en qué dirección.

El resultado se puede explorar en **https://medios.victoriano.me**.

## Qué hay aquí

| Carpeta | Contenido |
| --- | --- |
| `site/` | La web estática: HTML, CSS, JavaScript sin dependencias y los datos en JSON troceados por medio. |
| `data/virales_clasificados.csv` | El censo completo: 20.404 filas con medio, fecha, texto, métricas y clasificación (partido, dirección, ironía y confianzas). |
| `data/contexto_entidades.json` | La ficha de contexto de cada tuit: las personas, empresas y casos que menciona y a qué partido o caso están ligados. |
| `data/cambios_v2.csv` | El antes y el después de los 12.520 tuits políticos, para auditar la reclasificación de septiembre de 2026. |
| `data/raw/` | La descarga original de Apify, 62 ficheros JSON comprimidos, tal cual salió del actor. |
| `scripts/` | Todo el proceso, desde la descarga hasta la web. |

## Resultados principales

- De los 62 medios de la lista, 53 tuvieron algún tuit por encima de 100 retuits.
- 12.520 de los 20.404 tuits virales tienen lectura política clara. Los otros 7.884 son deportes, sucesos, cultura o política extranjera.
- El **PSOE** es el partido más señalado: 6.559 tuits, el 52 % de los políticos. Le siguen el **PP** con 3.368 (27 %), **Vox** con 520 y **Sumar** con 450. En 736 no se identifica un partido concreto y en 887 aparecen varios a la vez.
- El **76 %** de esos tuits son críticos (`perjudica`), el 7 % neutros y el 16 % favorables. Lo viral premia el conflicto.
- Índice de cada medio entre −1 (todo a la izquierda) y +1 (todo a la derecha). En los extremos: CTXT −0,85, Telediarios de TVE −0,78, Público −0,68, El Plural −0,68, elDiario.es −0,60, frente a TRECE +1,00, Periodista Digital +0,96, ESdiario +0,94, Libertad Digital +0,93, COPE +0,88.
- Los 62 medios de la lista publicaron 1,27 millones de tuits en el año. Este censo mira solo los que superaron los 100 retuits: 20.404, el 1,6 % del total.

## Cómo se obtuvieron los tuits

El universo son los 62 medios de la lista **Spanish Generalist Media** de X (id `1291353744735600640`).

La API oficial de X no sirve para esto: **ya no admite el filtro `min_retweets`**, su endpoint de listas solo devuelve las últimas 800 publicaciones y cobra 0,005 dólares por cada publicación leída, lo que habría dejado el censo en unos 5.900 dólares.

Se usó **Apify** con el actor `apidojo/twitter-scraper-lite`, que sí acepta la búsqueda avanzada de X. Una consulta por medio y por mes:

```text
from:<medio> min_retweets:100 -filter:retweets since:2025-10-01 until:2025-11-01
```

Cuatro detalles que condicionan el método y que se descubrieron probando:

1. El actor `apidojo/tweet-scraper` (el hermano mayor) devuelve vacío: está limitado por X. Hay que usar el lite.
2. El operador `list:<id>` no funciona en el actor, aunque la lista sea pública. De ahí que se consulte medio a medio.
3. Una sola consulta no alcanza más de cuatro o cinco meses hacia atrás, aunque se le dé un año de rango. De ahí el troceado mensual.
4. `maxItems` es un tope por ejecución, no por consulta. Si se meten varias consultas en una ejecución, el tope se reparte y se truncan los resultados.

Censo completo: 62 ejecuciones, 4 en paralelo, 10 minutos y **21,41 dólares**.

## Cómo se clasificaron

Con **TypeSafe** (modelo Jev, `jev-latest`) en dos pasos. A cada tuit se le pasa un estado con el medio, la fecha y el texto literal, más una nota de que los enlaces acortados y las imágenes no son visibles.

**Paso 1, filtro.** Pregunta de sí o no que devuelve probabilidad: ¿este tuit se refiere a algo que pueda afectar a un partido político español? No cuentan la política extranjera, el deporte, la cultura, los sucesos, la economía sin conexión política ni la tecnología. Corte en 0,5.

**Paso 1,5, ficha de contexto.** Jev no tiene conocimiento del mundo: no sabe quién es Marlaska, Cerdán ni Barrabés, y sin eso atribuía al PP escándalos que en realidad son del Gobierno. Antes del paso 2, **Gemini 3.7 Flash** con su herramienta de búsqueda de Google resuelve, en lotes de 10 tuits, las personas, empresas, casos e instituciones que aparecen y a qué partido o caso están ligadas. Si no conoce una entidad, la busca. Esa ficha entra en el estado de Jev como `contexto_entidades`. Costó 10,02 $ por los 12.520 tuits, con 1.753 búsquedas y 3.286 fuentes, y queda guardada en `contexto_entidades.json`.

**Paso 2, solo para los que pasan.** Tres preguntas en una sola llamada por tuit:

- `objetivo` (elección): PP, PSOE, Vox, Sumar, varios o ninguno, con probabilidades y confianza. La pregunta es **de qué partido trata el tuit**, no a quién beneficia, y los criterios llevan los nombres de los cargos conocidos para que un escándalo del Gobierno no se lea como una noticia sobre quien sale ganando.
- `direccion` (elección): beneficia, perjudica o neutro.
- `ironia` (sí o no): si el tuit usa ironía o sarcasmo, para no confundir un ataque burlón con un apoyo.

Resultado: 10.741 tuits con lectura política clara, 1.779 dudosos y 7.884 descartados. Ironía media detectada: 0,20, así que los pocos tuits marcados como favorables lo son de verdad y no por sarcasmo.

Esta es la **segunda pasada** de clasificación (septiembre de 2026). La primera se hizo sin ficha de contexto y con la pregunta anterior: al volver a clasificar los 12.520 tuits políticos, **3.816 cambiaron de partido** (el 30,5 %) y 1.648 de dirección. Casi todo el movimiento es `ninguno` y `varios` pasando a un partido concreto cuando la ficha aclara de qué va el tuit, y casos del Gobierno que antes se atribuían al PP. Los cambios se pueden auditar fila a fila en `cambios_v2.csv`.

### El índice por medio

Para cada medio se cuentan los tuits con partido concreto y dirección clara. Suman a la izquierda los que benefician a PSOE o Sumar y los que perjudican a PP o Vox. Suman a la derecha los que benefician a PP o Vox y los que perjudican a PSOE o Sumar. El índice es derecha menos izquierda partido por el total con dirección clara, y va de −1 a +1. Los tuits neutros no entran en el índice, pero sí aparecen contados en su columna.

## La web

Estática y sin dependencias: se abre sin construir nada. Empieza por el ranking para no soltar 20.404 tuits de golpe, y cada medio se carga solo cuando se pulsa. Dentro de cada medio se puede ordenar por retuits, me gusta, vistas o fecha, filtrar por partido, por dirección o por texto, y se pagina de 25 en 25.

La pestaña **Mapa** dibuja cada medio como una burbuja con su logo: en horizontal su índice de sesgo, en vertical cuántos tuits políticos tiene (escala de raíz cuadrada, para que los pequeños no queden aplastados) y el tamaño según sus retuits medios. Los logos salen de la foto de perfil de cada medio en X, descargados y recortados en círculo por `scripts/fetch_logos.py`.

- `site/data/index.json`: agregados por medio y totales globales.
- `site/data/medios/<medio>.json`: todos los tuits de ese medio.
- `site/data/top.json`: los 300 tuits virales con lectura política.
- `site/logos/`: los 53 logos circulares.

## Reproducir

```bash
# 1. Descargar los virales del último año (necesita APIFY_API_KEY en ~/.config/apify/api_key)
python3 scripts/fetch_virales.py

# 2. Filtro político y clasificación base (necesita TYPESAFE_API_KEY)
python3 scripts/classify_virales.py

# 3. Reclasificación con ficha de contexto de Gemini (necesita además la clave de Gemini en ~/.config/gemini/api_key)
python3 scripts/clasificar_v2.py --set politicos     # también --set dudosos o --set captura
python3 scripts/analyze_v2.py                        # índice nuevo y comparación con el anterior
python3 scripts/validar_v2.py                        # estabilidad de la dirección y variante estricta

# 4. Índice por medio y Excel de revisión
python3 scripts/analyze_virales.py
uv run --with openpyxl python3 scripts/build_xlsx_virales.py

# 5. Logos de los medios, desde el volcado de Apify
uv run --with pillow python3 scripts/fetch_logos.py

# 6. Datos de la web
python3 scripts/build_data.py

# 7. Comprobar la web en un navegador real
uv run --with playwright python3 scripts/check_site.py
```

Los scripts están pensados para reanudarse: lo que ya está descargado o clasificado no se repite. `analyze_v2.py` y `validar_v2.py` comparan contra la versión anterior del censo, que no está en el repositorio; hay que pasarle la copia vieja con `--viejo`.

## Despliegue

El sitio está publicado en **https://medios.victoriano.me** como estático desde el VPS, con Caddy y certificado automático, a partir de un clon de este repositorio en `/srv/medios`. Para actualizarlo después de un `push`:

```bash
cd /srv/medios && git pull
```

El bloque que lo sirve en `/etc/caddy/Caddyfile` es:

```text
medios.victoriano.me {
	bind 23.88.60.130
	root * /srv/medios/site
	encode gzip
	file_server
}
```

## Límites

- Solo se analiza el **texto** del tuit. Los enlaces y las imágenes no se abren, y eso baja la confianza en los tuits que son solo un titular con enlace.
- El filtro y la dirección son **juicios de un modelo**, no una verdad. Cada fila lleva su confianza y la web marca con un borde discontinuo las clasificaciones por debajo de 0,6.
- La ficha de contexto atribuye a quien gobierna las informaciones sobre ministerios, cuerpos del Estado y organismos públicos, aunque el tuit no señale una responsabilidad política. Quedan del orden de 210 tuits, sobre todo de sucesos y actuaciones policiales o judiciales, que podrían volver a `ninguno` con un criterio más estricto; está probado en `scripts/validar_v2.py`.
- Mide **qué se comparte**, no la línea editorial de la redacción. Un medio puede salir centrado o escorado según qué le viraliza ese mes.
- Los retuits son la métrica pública del tuit, no el alcance real.
- Las fechas de la ventana son 19 sep 2025 a 19 sep 2026. La primera y la última son parciales por los extremos del rango.

## Datos y licencia

El código es MIT (ver `LICENSE`). Los tuits son contenido público de sus autores y se reproducen con fines de análisis y crítica; cada tarjeta de la web enlaza al tuit original en X.
