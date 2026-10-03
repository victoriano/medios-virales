# Método completo

Este documento describe **cómo se construyó cada dato del proyecto**, con los números verificados
en su fichero de origen. El `README.md` explica el resultado y la web; aquí está el proceso.

Si buscas el punto de entrada para continuar el trabajo, lee antes `AGENTS.md`.

## Índice

1. [Las dos series](#1-las-dos-series)
2. [El censo viral](#2-el-censo-viral)
3. [La serie histórica](#3-la-serie-histórica)
4. [La clasificación](#4-la-clasificación)
5. [La capa de reclasificación contextual](#5-la-capa-de-reclasificación-contextual)
6. [El índice y el mapa](#6-el-índice-y-el-mapa)
7. [Coste real](#7-coste-real)
8. [Verificación](#8-verificación)

---

## 1. Las dos series

El proyecto mide dos cosas distintas y las mezcla en la misma web. No son intercambiables.

| | Censo viral | Serie histórica |
| --- | --- | --- |
| Qué es | Todo lo que superó 100 retuits | Muestra de hasta 100 tuits por medio y mes |
| Ventana | 19 sep 2025 a 19 sep 2026 | 2 may 2018 a 24 sep 2026 |
| Filas | 21.489 | 602.906 |
| Políticos | 13.412 | 155.922 |
| Descarga | Apify | twitterapi.io |
| Para qué sirve | Medir la cola viral del último año | Comparar medios entre sí y a lo largo del tiempo |

**La serie histórica no es un censo.** Son 100 meses con seis días muestreados cada uno y un tope
de 100 tuits por medio y mes. Sirve para comparar, no para contar el total publicado.

---

## 2. El censo viral

Universo: los medios de la lista **Spanish Generalist Media** de X, id `1291353744735600640`.
66 cuentas en la lista, 62 en el censo original más 4 cuentas de programa añadidas después
(Mañaneros 360, Malas lenguas, Al Rojo Vivo y laSexta Columna).

Descarga con el actor `apidojo/twitter-scraper-lite` de Apify, una consulta por medio y mes:

```text
from:<medio> min_retweets:100 -filter:retweets since:2025-10-01 until:2025-11-01
```

La API oficial de X no sirve para esto: ya no admite `min_retweets`, su endpoint de listas solo
devuelve las últimas 800 publicaciones y cobra 0,005 dólares por publicación leída, lo que habría
dejado el censo en unos 5.900 dólares.

Cuatro límites del actor, descubiertos probando y no leyendo:

1. El actor hermano `apidojo/tweet-scraper` devuelve vacío. Hay que usar el lite.
2. El operador `list:<id>` no funciona en el actor, aunque la lista sea pública. De ahí la consulta
   medio a medio.
3. Una sola consulta no alcanza más de cuatro o cinco meses hacia atrás, aunque se le dé un año de
   rango. De ahí el troceado mensual.
4. `maxItems` es un tope **por ejecución**, no por consulta. Varias consultas en una ejecución se
   reparten el tope y se truncan.

Resultado: 62 ejecuciones, 4 en paralelo, unos 10 minutos y 21,41 dólares. Los cuatro programas
añadidos después sumaron 1.085 tuits y 1,05 dólares, sin repetir el censo ya hecho.

---

## 3. La serie histórica

Aquí está el trabajo que **no vive en el repositorio**. Todo el corpus está en el taller:

```
~/typesafe-lab/politica/medios/polarizacion/
├── historico_io_100_may2018_aug2023/    384.021 filas · 2 may 2018 a 16 ago 2023
├── legislatura_xv_io_100/               218.885 filas · 17 ago 2023 a 24 sep 2026
└── reclasificacion_contextual_psoe_20260925/
```

Cada carpeta contiene `clasificado.jsonl` (la base) y `clasificado_contextual.jsonl` (con la capa
contextual aplicada), más `clasificar_estado.json`, que guarda el coste acumulado.

### Por qué twitterapi.io y no Apify

La tarifa de twitterapi.io es de 15 créditos por tuit devuelto, o **0,00015 dólares por tuit**,
frente a 0,0003 del actor de Apify. La mitad. Y aporta dos cosas que el actor no tiene: búsqueda
histórica con operadores y paginación profunda.

La contrapartida, medida y no supuesta: **su filtro de fechas es impreciso**. Una consulta
`since:D until:D+1` devuelve tuits del día D **y** del D+1, así que se paga alrededor del doble de
lo útil. Por eso el descargador guarda todo lo devuelto y marca cada fila con `en_muestra` según
caiga o no en un día muestreado. Al contar la muestra hay que filtrar por esa marca, no por el
número de líneas del fichero.

### El diseño del muestreo

**Seis días por mes**, y los mismos días para **todas** las cuentas de ese mes. Si cada medio
tuviera días distintos, el día de la semana se mezclaría con el efecto del medio. Los días se
eligen con semilla fija para que el muestreo sea reproducible.

**Cinco tramos por mes.** Para cada par medio y mes, el periodo útil se divide en cinco tramos y se
pide una sola página `Latest` por tramo. El máximo nominal es de 100 resultados por pareja. Las
respuestas y su coste se registran **atómicamente en SQLite** para que una interrupción no obligue a
repetir trabajo pagado.

Los dos descargadores son reanudables: si un mes ya está completo, se salta.

### Qué descargó exactamente

| | Histórico | XV Legislatura |
| --- | --- | --- |
| Script | `descargar_serie_historica_io.py` | `descargar_legislatura_xv_io.py` |
| Ventana | 2018-05-02 a 2023-08-17 | 2023-08-17 a 2026-09-25 |
| Meses | 64 | 38 |
| Cuentas | 66 | 66 |
| Parejas completas | 4.224 de 4.224 | 2.508 de 2.508 |
| Llamadas | 21.120 | 12.540 |
| Tuits devueltos | 384.021 | 218.885 |
| Items facturados | 385.683 | 220.142 |
| Coste | 57,85245 USD | 33,0213 USD |
| Tope previsto | 63,36 USD | 37,62 USD |

Los totales están en `resumen.json` dentro de cada carpeta. **Los dos descargadores nunca mezclan la
serie histórica con el piloto de 2025-10 a 2026-09**, que se hizo aparte.

### Qué NO se ha hecho

- No se ha explicado el hueco de cobertura de `DiarioSabemos`: con twitterapi.io recuperó 637 tuits
  frente a 2.538 con Apify, y un ID ausente existe tanto en FxTwitter como en el endpoint por ID de
  twitterapi.io, pero no aparece en su búsqueda. Es un hueco del índice, no un tuit inexistente.
- No se ha auditado la cobertura por medio y mes. Hasta que se haga, sus resultados no se pueden
  presentar como censo exhaustivo, solo como muestra.

---

## 4. La clasificación

### Paso 1: el filtro político

**TypeSafe**, modelo Jev (`jev-latest`). Una pregunta de sí o no que devuelve probabilidad: si el
tuit se refiere a algo que pueda afectar a un partido político español. No cuentan la política
extranjera, el deporte, la cultura, los sucesos, la economía sin conexión política ni la tecnología.
Corte en 0,5.

### Paso 1,5: la ficha de contexto

**Gemini 3.7 Flash** con búsqueda de Google, en lotes de 10 tuits. Resuelve las personas, empresas,
casos e instituciones que aparecen y a qué partido o caso están ligados.

Hace falta porque Jev no tiene conocimiento del mundo: no sabe quién es Marlaska, Cerdán ni
Barrabés, y sin eso atribuía al PP escándalos que en realidad son del Gobierno. En el censo viral
costó 10,02 dólares por 12.520 tuits, con 1.753 búsquedas y 3.286 fuentes.

### Paso 2: el partido y la dirección

**Gemini 3.7 Flash**, una llamada por lote de diez, con la ficha de contexto delante y permiso para
buscar si no conoce a alguien o el caso. Devuelve:

- `partido`: PP, PSOE, Vox, Sumar, varios o ninguno. Es **el partido al que el tuit critica o del
  que sale en su defensa**.
- `direccion`: beneficia, perjudica o neutro, sobre ese partido.
- `conf`: alta, media o baja.
- `voz` y `direccion_motivo`: quién habla y el motivo en menos de doce palabras.

La regla que más discusión ha generado: **si lo que se critica es una decisión del Gobierno de
España o de un ministerio, el partido es el PSOE**, aunque la noticia ocurra en una ciudad o
comunidad gobernada por otro partido. Es una decisión de modelado y está elegida a propósito.

### La clasificación de la serie histórica

Script `clasificar_legislatura_xv.py`. Gemini 3.7 Flash, una fila JSONL por tuit, reanudable, con
estado acumulado de tokens y coste y un límite global de gasto.

Precios aplicados: 0,75 USD por millón de tokens de entrada y 3,75 USD por millón de salida.
La confianza se mapea a números con `{"alta": 0.9, "media": 0.7, "baja": 0.5}`, que **no son
probabilidades calibradas**.

| | Histórico | XV Legislatura |
| --- | --- | --- |
| Filas clasificadas | 384.021 | 218.885 |
| Tokens de entrada | 31.465.442 | 15.600.424 |
| Tokens de salida | 7.796.716 | 4.558.485 |
| Coste | 52,836766 USD | 28,794637 USD |

### Defectos conocidos del clasificador

Los cuatro están comprobados, no supuestos:

1. **No envía la fecha del tuit.** Una sonda local interceptó la llamada sin conectar a la API y
   confirmó `date_sent=false`. El modelo aplica conocimiento de hoy a un tuit de 2019.
2. **Recorta el texto a 400 caracteres.**
3. **El prompt pide motivos, pero el parser no los conserva.**
4. **Los JSONL no guardan la versión del modelo** que respondió en cada fila.

---

## 5. La capa de reclasificación contextual

Existe una segunda pasada, independiente y reanudable, sobre los tuits que mencionan figuras cuyo
papel contextual puede invertir el efecto sobre el PSOE.

- Script de generación: `reclasificar_contexto_psoe.py` (Gemini 3.7 Flash).
- Script de aplicación: `aplicar_reclasificacion_contextual.py`.
- Salida: `reclasificacion_contextual_psoe_20260925/`.

**Nunca sobrescribe `clasificado.jsonl`.** La corrección vive en un fichero aparte y solo entra el
efecto claro con confianza alta o media. Los casos de confianza baja, efecto incierto u otra persona
conservan su etiqueta anterior.

Resultado verificado en `aplicacion_resumen.json`:

| | Candidatos | Overrides válidos | Cambios reales |
| --- | --- | --- | --- |
| Histórico | | 447 | 192 |
| XV Legislatura | | 1.296 | 409 |
| **Total** | 3.813 | 1.743 | **601** |

Coste: 541.378 tokens de entrada, 201.823 de salida, **1,162870 USD**.

### Advertencia importante

`aplicar_reclasificacion_contextual.py` **fuerza `partido="Psoe"`** cuando aplica una revisión. Eso
puede confundir el partido criticado con un beneficiario indirecto. Por tanto:

- La capa debe figurar siempre en la procedencia de la referencia.
- **Sus 601 cambios no son 601 mejoras verificadas.**
- No se puede dar por supuesto que el rendimiento sea equivalente en otros partidos.

---

## 6. El índice y el mapa

### El índice por medio

Para cada medio se cuentan los tuits con partido concreto y dirección clara.

- Suman a la **izquierda** los que benefician a PSOE o Sumar y los que perjudican a PP o Vox.
- Suman a la **derecha** los que benefician a PP o Vox y los que perjudican a PSOE o Sumar.
- El índice es `(derecha − izquierda) / total con dirección clara`, y va de −1 a +1.

Los tuits neutros no entran en el índice, pero sí se cuentan en su columna.

### El mapa

Cada medio es una burbuja:

- **Eje horizontal:** porcentaje de los tuits con lado claro que va a la derecha. 0 es todos a la
  izquierda, 100 todos a la derecha y 50 equilibrio.
- **Eje vertical:** número absoluto de tuits con lado claro. La escala se ajusta al periodo
  seleccionado y se mantiene estable durante la animación anual.
- **Tamaño:** mediana de retuits de esos mismos tuits, con radio proporcional a la raíz cuadrada y
  límites visuales.
- **Color:** rojo a la izquierda, azul a la derecha y gris en el centro, según la convención
  española.

El control de retuits tiene tres posiciones: **Todos los tuits**, **100 RT o más** y **Comparar
ambos**. En el modo de comparación cada medio lleva dos puntos (aro continuo para todos los tuits,
discontinuo para los de 100 RT o más) y una flecha que va de uno a otro.

**Solo se dibujan las flechas de los medios con al menos 200 tuits con lado claro en las dos
series.** En el proyecto de 66 medios, de 55 candidatos solo 20 pasaron el corte. Una flecha que
saliera de una muestra corta mentiría sobre el desplazamiento.

### El corte de inclusión

Más de **50 tuits con lado claro** en toda la muestra para entrar en el mapa y el ranking. Por
debajo de 15 tuits políticos el índice no significa nada. La web publica siempre el `n`.

---

## 7. Coste real

Todo sale de un libro de coste del propio proceso, no de una tabla de tarifas.

### Censo viral

| Concepto | Coste |
| --- | --- |
| Descarga con Apify (62 ejecuciones) | 21,41 USD |
| Cuatro programas añadidos después | 1,05 USD |
| Clasificación acumulada (`costes_ia.jsonl`, 19.193 lotes) | 27,1338 USD |

### Serie histórica

| Concepto | Histórico | XV Legislatura | Total |
| --- | --- | --- | --- |
| Descarga (twitterapi.io) | 57,85245 USD | 33,0213 USD | 90,87375 USD |
| Clasificación (Gemini 3.7 Flash) | 52,836766 USD | 28,794637 USD | 81,631403 USD |
| Reclasificación contextual | | | 1,16287 USD |
| **Total** | | | **173,668023 USD** |

Unos **173,67 dólares** para construir nueve años de serie histórica de 66 medios. Para comparar, la
API oficial de X habría costado unos 5.900 dólares solo el censo viral de un año.

### Trampa al leer los costes

Los ficheros `costes_*.jsonl` guardan **totales acumulados por lote**, no incrementos. Si sumas
todas las líneas inflas la cifra. La buena es la última línea. En `costes_ia.jsonl` hay 791 líneas y
la última marca 27,1338 USD; sumar las 791 daría 10.488 USD, que es un disparate.

---

## 8. Verificación

Comprobaciones que existen y se pueden ejecutar:

```bash
# Consistencia de datos y mapa de la web (6 pruebas). NO evalúa calidad semántica.
python3 -B scripts/test_site_data.py

# La web contra el sitio publicado, en un navegador real
uv run --with playwright python3 scripts/check_site.py

# Los dos corpus. Debe dar 384.021 + 218.885 = 602.906 filas
wc -l ~/typesafe-lab/politica/medios/polarizacion/*/clasificado_contextual.jsonl

# Y los políticos: 99.356 + 56.566 = 155.922 filas con politica verdadero
```

Antes de publicar cualquier cifra nueva, compruébala en su fichero. Este documento se escribió
leyendo los ficheros, no recordando la conversación donde se hicieron.
