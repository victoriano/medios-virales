# Medios virales: qué partido beneficia cada medio

Análisis de los **20.404 tuits con más de 100 retuits** publicados por los medios generalistas españoles entre el **19 de septiembre de 2025 y el 19 de septiembre de 2026**, clasificados uno a uno por el partido al que afectan y en qué dirección.

El resultado se puede explorar en **https://medios.victoriano.me**.

## Qué hay aquí

| Carpeta | Contenido |
| --- | --- |
| `site/` | La web estática: HTML, CSS, JavaScript sin dependencias y los datos en JSON troceados por medio. |
| `data/virales_clasificados.csv` | El censo completo: 20.404 filas con medio, fecha, texto, métricas y clasificación (partido, dirección, ironía y confianzas). |
| `data/raw/` | La descarga original de Apify, 62 ficheros JSON comprimidos, tal cual salió del actor. |
| `scripts/` | Todo el proceso, desde la descarga hasta la web. |

## Resultados principales

- De los 62 medios de la lista, 53 tuvieron algún tuit por encima de 100 retuits.
- 12.520 de los 20.404 tuits virales tienen lectura política clara. Los otros 7.884 son deportes, sucesos, cultura o política extranjera.
- El **PSOE** es el partido más señalado: 4.718 tuits, el 38 % de los políticos. Le siguen el **PP** con 2.973 (24 %), **Vox** con 446 y **Sumar** con 292. En 2.891 no se identifica un partido concreto.
- El **71 %** de esos tuits son críticos (`perjudica`), el 16 % neutros y el 13 % favorables. Lo viral premia el conflicto.
- Índice de cada medio entre −1 (todo a la izquierda) y +1 (todo a la derecha). En los extremos: infoLibre −0,82, CTXT −0,81, Público −0,79, El Plural −0,77, elDiario.es −0,71, frente a Periodista Digital +0,95, ESdiario +0,87, El Toro TV +0,87, COPE +0,85, Libertad Digital +0,80, okdiario +0,79.

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

**Paso 2, solo para los que pasan.** Tres preguntas en una sola llamada por tuit:

- `objetivo` (elección): PP, PSOE, Vox, Sumar, varios o ninguno, con probabilidades y confianza.
- `direccion` (elección): beneficia, perjudica o neutro.
- `ironia` (sí o no): si el tuit usa ironía o sarcasmo, para no confundir un ataque burlón con un apoyo.

Resultado: 10.741 tuits con lectura política clara, 1.779 dudosos y 7.884 descartados. Ironía media detectada: 0,19, así que los pocos tuits marcados como favorables lo son de verdad y no por sarcasmo.

### El índice por medio

Para cada medio se cuentan los tuits con partido concreto y dirección clara. Suman a la izquierda los que benefician a PSOE o Sumar y los que perjudican a PP o Vox. Suman a la derecha los que benefician a PP o Vox y los que perjudican a PSOE o Sumar. El índice es derecha menos izquierda partido por el total con dirección clara, y va de −1 a +1. Los tuits neutros no entran en el índice, pero sí aparecen contados en su columna.

## La web

Estática y sin dependencias: se abre sin construir nada. Empieza por el ranking para no soltar 20.404 tuits de golpe, y cada medio se carga solo cuando se pulsa. Dentro de cada medio se puede ordenar por retuits, me gusta, vistas o fecha, filtrar por partido, por dirección o por texto, y se pagina de 25 en 25.

- `site/data/index.json`: agregados por medio y totales globales.
- `site/data/medios/<medio>.json`: todos los tuits de ese medio.
- `site/data/top.json`: los 300 tuits virales con lectura política.

## Reproducir

```bash
# 1. Descargar los virales del último año (necesita APIFY_API_KEY en ~/.config/apify/api_key)
python3 scripts/fetch_virales.py

# 2. Clasificar con TypeSafe (necesita TYPESAFE_API_KEY)
python3 scripts/classify_virales.py

# 3. Índice por medio y Excel de revisión
python3 scripts/analyze_virales.py
uv run --with openpyxl python3 scripts/build_xlsx_virales.py

# 4. Datos de la web
python3 scripts/build_data.py

# 5. Comprobar la web en un navegador real
uv run --with playwright python3 scripts/check_site.py
```

Los scripts están pensados para reanudarse: lo que ya está descargado o clasificado no se repite.

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
- Mide **qué se comparte**, no la línea editorial de la redacción. Un medio puede salir centrado o escorado según qué le viraliza ese mes.
- Los retuits son la métrica pública del tuit, no el alcance real.
- Las fechas de la ventana son 19 sep 2025 a 19 sep 2026. La primera y la última son parciales por los extremos del rango.

## Datos y licencia

El código es MIT (ver `LICENSE`). Los tuits son contenido público de sus autores y se reproducen con fines de análisis y crítica; cada tarjeta de la web enlaza al tuit original en X.
