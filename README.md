# Medios virales: qué partido beneficia cada medio

Análisis de los **20.404 tuits con más de 100 retuits** publicados por los medios generalistas españoles entre el **19 de septiembre de 2025 y el 19 de septiembre de 2026**, clasificados uno a uno por el partido al que afectan y en qué dirección.

El resultado se puede explorar en **https://medios.victoriano.me**.

## Qué hay aquí

| Carpeta | Contenido |
| --- | --- |
| `site/` | La web estática: HTML, CSS, JavaScript sin dependencias y los datos en JSON troceados por medio. |
| `data/virales_clasificados.csv` | El censo completo: 21.489 filas con medio, fecha, texto, métricas y clasificación (partido, dirección, ironía y confianzas). |
| `data/contexto_entidades.json` | La ficha de contexto de cada tuit: las personas, empresas y casos que menciona y a qué partido o caso están ligados. |
| `data/cambios_v2.csv` | El antes y el después del partido en los 12.520 tuits políticos, para auditar la reclasificación de septiembre de 2026. |
| `data/cambios_direccion.csv` | Lo mismo con la dirección: el antes, el después, la confianza y quién habla en cada tuit. |
| `data/cambios_v5.csv` | La pasada definitiva: partido y dirección antes y después, con la confianza y el motivo de cada cambio. |
| `data/raw/` | La descarga original de Apify, los ficheros JSON comprimidos tal cual salieron del actor. |
| `scripts/` | Todo el proceso, desde la descarga hasta la web. |

## Resultados principales

- La lista de seguimiento tiene 66 cuentas. La web publica las 57 que tuvieron algún tuit por encima de 100 retuits en la ventana, incluidas las cuentas de programa: **La Ventana**, **Hora 25** y **Hoy por Hoy** de la SER, y **Mañaneros 360**, **Malas lenguas**, **Al Rojo Vivo** y **laSexta Columna**. Sus tuits cuentan por separado de los de su cadena, así que hay solapamiento entre programa y canal.
- 13.412 de los 21.489 tuits virales tienen lectura política clara. Los otros 8.077 son deportes, sucesos, cultura o política extranjera.
- El **PSOE** es el partido más señalado: 6.729 tuits, el 50 % de los políticos. Le siguen el **PP** con 3.903 (29 %), **Vox** con 572 y **Sumar** con 285. En 1.342 no se identifica un partido concreto y en 581 aparecen varios a la vez.
- El **70 %** de esos tuits son críticos (`perjudica`), el 14 % neutros y el 16 % favorables.
- Índice de cada medio entre −1 (todo a la izquierda) y +1 (todo a la derecha). En los extremos: El Plural −0,96, infoLibre −0,94, Público −0,93, El HuffPost −0,90, elDiario.es −0,86, frente a esRadio +1,00, ESdiario +1,00, TRECE +1,00, Periodista Digital +1,00, Libertad Digital +0,99, okdiario +0,98.
- El índice es **más extremo que en la primera versión**, y conviene leerlo sabiendo por qué: al exigir que el tuit señale a un partido, los que no lo hacen salen del índice (los `ninguno` pasan de 736 a 1.342 y los neutros de 928 a 1.926), así que la ratio se queda solo con la señal clara. Los medios con pocos tuits pueden llegar a ±1 con muestras pequeñas, y por eso la web publica siempre el `n`. Con menos de 15 tuits políticos no se dibuja la burbuja en el mapa y el índice no significa nada, como le pasa a laSexta Columna este año.
- Los 62 medios de la lista original publicaron 1,27 millones de tuits en el año. Este censo mira solo los que superaron los 100 retuits: 21.489, el 1,7 % del total.

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

**Paso 2, solo para los que pasan.** El partido y la dirección los decide **Gemini 3.7 Flash** en una sola llamada por lote de diez tuits, con la ficha de contexto delante y permiso para buscar en Google si no conoce a alguien o el caso. Necesita ese conocimiento: quién es cada persona y qué significa políticamente lo que se dice. Antes lo hacía Jev y no llegaba, porque marcaba como perjudicial cualquier tuit con tono de conflicto, incluidos un ministro respondiendo a la oposición o un periodista defendiendo al presidente de las críticas de un expresidente.

- `partido`: PP, PSOE, Vox, Sumar, varios o ninguno. Es **el partido al que el tuit critica o del que sale en su defensa**. Regla clave: si lo que se critica es una decisión del Gobierno de España o de un ministerio, el partido es el PSOE, aunque la noticia ocurra en una ciudad o comunidad gobernada por otro partido.
- `direccion`: beneficia, perjudica o neutro, sobre ese partido. Como depende de a quién se señala, se decide en la misma llamada que el partido.
- `ironia`: si el tuit usa ironía o sarcasmo, para no confundir un ataque burlón con un apoyo. Viene de la primera pasada y se mantiene como control.
- `voz` y `direccion_motivo`: quién habla y el motivo en menos de doce palabras. Son la parte auditable de cada fila.

El criterio del partido es una decisión de modelado, no una verdad, y se ve bien con un ejemplo: un tuit que critica los 25 millones que el Gobierno central reparte en Ceuta se etiqueta PSOE, aunque Ceuta esté gobernada por el PP, porque lo que se está juzgando es una decisión del Gobierno. Con el criterio contrario, ese tuit saldría PP y contaría como izquierda en el índice, que es lo que no quería el autor del análisis.

Resultado: 10.741 tuits con lectura política clara, 1.779 dudosos y 7.884 descartados. Ironía media detectada: 0,20, así que los pocos tuits marcados como favorables lo son de verdad y no por sarcasmo.

Esta es la **segunda vuelta** de clasificación (septiembre de 2026), en tres pasadas auditables:

- **Partido.** Al añadir la ficha de contexto y cambiar la pregunta, **3.816 de los 12.520 tuits políticos cambiaron de partido** (el 30,5 %). Casi todo el movimiento es `ninguno` y `varios` pasando a un partido concreto cuando la ficha aclara de qué va el tuit, y casos del Gobierno que antes se atribuían al PP. Detalle en `cambios_v2.csv`.
- **Dirección.** Al reescribir la pregunta para mirar quién habla, **1.359 cambiaron de dirección** (el 10,9 %), 701 de ellos de `perjudica` a `beneficia`. Detalle en `cambios_direccion.csv`.
- **Partido y dirección a la vez.** Con el criterio del partido ya cerrado (el partido al que el tuit critica o del que sale en su defensa), los dos juicios los hace Gemini en una sola llamada: **3.296 tuits cambian** de partido, de dirección o de los dos. Costó 13,24 $, con 213 búsquedas. Detalle en `cambios_v5.csv`.

Los cuatro programas añadidos después (Mañaneros 360, Malas lenguas, Al Rojo Vivo y laSexta Columna) se descargaron y clasificaron aparte con el mismo método, sin repetir el censo ya hecho: 1.085 tuits y **1,05 $** de Apify. Lo hace `add_medios.py`, que lee `members.json`, pasa la puerta con Jev y resuelve partido y dirección con Gemini.

### El índice por medio

Para cada medio se cuentan los tuits con partido concreto y dirección clara. Suman a la izquierda los que benefician a PSOE o Sumar y los que perjudican a PP o Vox. Suman a la derecha los que benefician a PP o Vox y los que perjudican a PSOE o Sumar. El índice es derecha menos izquierda partido por el total con dirección clara, y va de −1 a +1. Los tuits neutros no entran en el índice, pero sí aparecen contados en su columna.

## La web

Estática y sin dependencias: se abre sin construir nada. Arranca en el **mapa** y cada medio se carga solo cuando se pulsa (y se adelanta al pasar el ratón por encima). Dentro de cada medio se puede ordenar por retuits, me gusta, vistas o fecha, filtrar por partido, por dirección o por texto, y se pagina de 25 en 25.

La pestaña **Mapa** dibuja cada medio como una burbuja con su logo: en horizontal su posición en la escala izquierda → derecha, en vertical cuántos tuits con lectura política tiene (escala de raíz cuadrada, para que los pequeños no queden aplastados) y el tamaño según sus retuits medios. Es la vista por defecto. El eje va de izquierda a derecha — el cero cae en el borde izquierdo del mapa y el cien en el derecho, porque `posicion = 100 × derecha / (izquierda + derecha)` es el campo que trae `site/data/polarizacion.json` — y los colores siguen la convención española, **rojo para los medios de izquierda y azul para los de derecha** (con gris para el centro). Los logos salen de la foto de perfil de cada medio en X, descargados, recortados en círculo y guardados en WebP por `scripts/fetch_logos.py`.

El control de series del mapa tiene tres posiciones: **solo lo publicado** (la muestra de seis días al mes clasificada), **solo lo viral** (el censo de tuits con más de 100 retuits, el mismo que ordena el ranking) y **las dos posiciones**, que es la vista por defecto. En el modo de las dos, cada medio lleva dos puntos — aro continuo el publicado, discontinuo el viral — y una **flecha que va del punto publicado al viral**, es decir, hacia dónde se desplaza el medio cuando su contenido se comparte. Solo se dibujan los medios con muestra suficiente en las dos series (200 o más tuits con lado claro en cada una, 20 de los 55), porque una flecha que saliera de una muestra corta mentiría sobre el desplazamiento.

- `site/data/polarizacion.json`: lo publicado y lo viral de cada medio, con la posición de las dos series, la brecha entre ellas y el desglose por meses.
- `site/data/index.json`: agregados por medio y totales globales.
- `site/data/medios/<medio>.json`: todos los tuits de ese medio.
- `site/data/top.json`: los 300 tuits virales con lectura política.
- `site/logos/`: los 50 logos circulares. `scripts/build_data.py` lleva la lista `EXCLUIR` con las cuentas que no se publican y borra del sitio los JSON que sobren.

## Reproducir

```bash
# 1. Descargar los virales del último año (necesita APIFY_API_KEY en ~/.config/apify/api_key)
python3 scripts/fetch_virales.py

# 2. Filtro político y clasificación base (necesita TYPESAFE_API_KEY)
python3 scripts/classify_virales.py

# 3. Reclasificación con ficha de contexto de Gemini (necesita además la clave de Gemini en ~/.config/gemini/api_key)
python3 scripts/clasificar_v2.py --set politicos     # ficha de contexto + partido
python3 scripts/clasificar_v5_partido_direccion.py   # el definitivo: partido y dirección juntos, 12.520 tuits
python3 scripts/analyze_v2.py                        # índice nuevo y comparación con el anterior
python3 scripts/validar_v2.py                        # estabilidad de la dirección
# anadir medios nuevos sin repetir el censo ya clasificado (lee members.json y virales/<handle>.json)
python3 scripts/add_medios.py                        # o --handles @a,@b
# clasificar_v3_direccion.py y clasificar_v4_direccion_gemini.py son pasos intermedios, se conservan como registro

# 4. Índice por medio y Excel de revisión
python3 scripts/analyze_virales.py
uv run --with openpyxl python3 scripts/build_xlsx_virales.py

# 5. Logos de los medios, desde el volcado de Apify
uv run --with pillow python3 scripts/fetch_logos.py

# 6. Datos de la web
python3 scripts/build_data.py

# 7. Comprobar la web en un navegador real (contra el sitio publicado, con la URL delante)
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
- La ficha de contexto y el juicio de partido y dirección los hace un modelo, con permiso para buscar en la web, y son un juicio, no una verdad. Cada fila lleva su confianza y el motivo, y la web marca con un borde discontinuo las clasificaciones por debajo de 0,6.
- El criterio del partido (al que el tuit critica o del que sale en su defensa) es una decisión de modelado, no un hecho. Cambiarlo cambia las etiquetas de miles de tuits, aunque el índice apenas se mueve con él porque las dos lecturas caen casi siempre del mismo lado.
- Mide **qué se comparte**, no la línea editorial de la redacción. Un medio puede salir centrado o escorado según qué le viraliza ese mes.
- Los retuits son la métrica pública del tuit, no el alcance real.
- Las fechas de la ventana son 19 sep 2025 a 19 sep 2026. La primera y la última son parciales por los extremos del rango.

## Datos y licencia

El código es MIT (ver `LICENSE`). Los tuits son contenido público de sus autores y se reproducen con fines de análisis y crítica; cada tarjeta de la web enlaza al tuit original en X.
