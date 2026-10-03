# AGENTS.md — guía de continuidad

Este fichero existe para que **cualquier agente o persona pueda continuar el proyecto sin el
contexto de la conversación donde se hizo**. Si acabas de llegar, lee esto entero antes de tocar
nada. Está escrito para que puedas decidir por tu cuenta, no para que repitas lo que ya se hizo.

## Qué es este proyecto

Un análisis del **sesgo político de los medios generalistas españoles**, medido sobre sus tuits, y
una web pública para explorarlo: **https://medios.victoriano.me**.

La pregunta que responde no es «¿este medio miente?», sino dos más concretas:

1. **¿A quién beneficia o perjudica lo que publica cada medio?** Es el índice publicado.
2. **¿Cuánto se deforma un medio cuando su contenido se comparte?** Es la brecha entre lo publicado
   y lo viral, que la web dibuja como una flecha en el mapa.

## Las dos series, y por qué son dos

El proyecto tiene **dos corpus distintos** y es el error más fácil de cometer confundirlos. Miden
cosas diferentes, se descargaron con proveedores diferentes y no son intercambiables.

| Corpus | Qué es | Ventana | Filas | Políticos | Fuente de descarga |
| --- | --- | --- | --- | --- | --- |
| **Censo viral** | Todos los tuits con **100 retuits o más** | 19 sep 2025 a 19 sep 2026 | 21.489 | 13.412 | Apify |
| **Serie histórica** | **Muestra** de hasta 100 tuits por medio y mes | 2 may 2018 a 24 sep 2026 | 602.906 | 155.922 | twitterapi.io |

La primera es un **censo**: está todo lo que superó el corte. La segunda es una **muestra**: sirve
para comparar medios entre sí y a lo largo del tiempo, pero **no es el total publicado**.

Léelo otra vez, porque de aquí salen casi todos los malentendidos: cuando el mapa muestra la
«serie completa 2018 a 2026», está dibujando la muestra de 100 por medio y mes, no un censo de
nueve años.

## Dónde vive cada cosa

Tres ubicaciones. Ninguna es opcional y no están sincronizadas entre sí.

| Ruta | Qué contiene | En git |
| --- | --- | --- |
| `~/Code/medios-virales` | El repositorio. Web, scripts, datos del censo viral. Es lo que se publica. | Sí |
| `/srv/medios` | Clon del repositorio que sirve la web con Caddy. Solo se actualiza con `git pull`. | Sí |
| `~/typesafe-lab/politica/medios/polarizacion` | El taller. Corpus de la serie histórica, descargadores, clasificadores y libros de coste. **4,8 GB y no está en git.** | No |

Consecuencia práctica: **el repositorio no contiene la serie histórica**. Los dos ficheros de los
que sale el mapa de nueve años son:

```
~/typesafe-lab/politica/medios/polarizacion/historico_io_100_may2018_aug2023/clasificado_contextual.jsonl
~/typesafe-lab/politica/medios/polarizacion/legislatura_xv_io_100/clasificado_contextual.jsonl
```

`scripts/build_legislatura_data.py` los lee de ahí por ruta absoluta. Si trabajas en otra máquina,
o esos ficheros no están, o el script falla.

## Cómo está montado el flujo

Cuatro etapas. Cada una se puede repetir sin rehacer las anteriores, porque todo es reanudable.

### 1. Descarga

**Censo viral** (`scripts/fetch_virales.py`): actor `apidojo/twitter-scraper-lite` de Apify. Una
consulta por medio y por mes:

```text
from:<medio> min_retweets:100 -filter:retweets since:2025-10-01 until:2025-11-01
```

**Serie histórica** (`descargar_legislatura_xv_io.py` y `descargar_serie_historica_io.py` en el
taller): `twitterapi.io`, mucho más barato. Para cada medio y mes se divide el periodo útil en
**cinco tramos** y se pide **una página `Latest` por tramo**, con un máximo nominal de 100
resultados por pareja. Muestreo de **seis días por mes**, los mismos para todas las cuentas, con
semilla fija.

### 2. Clasificación

**Filtro político con TypeSafe** (modelo Jev, `jev-latest`): pregunta de sí o no con corte en 0,5.
Deja fuera deporte, sucesos, cultura, economía sin conexión política y política extranjera.

**Ficha de contexto con Gemini 3.7 Flash**: resuelve quién es cada persona, empresa o caso y a qué
partido está ligado, con búsqueda de Google cuando hace falta. Jev no tiene conocimiento del mundo
y sin esto atribuía al PP escándalos que son del Gobierno.

**Partido y dirección con Gemini 3.7 Flash**, en lotes de diez y con la ficha delante.

### 3. Agregación

`scripts/build_legislatura_data.py` y `scripts/build_data.py` producen los JSON que consume la web.

### 4. Publicación

`git push` y luego `git pull` en `/srv/medios`. La web es estática, sin dependencias y sin build.

## Las reglas del proyecto que no son negociables

Estas decisiones son **de modelado, no verdades**. Están elegidas a propósito y cambiarlas cambia
miles de etiquetas. Antes de tocarlas, entiende por qué están así.

1. **El partido es el objetivo, no el hablante.** Se etiqueta el partido al que el tuit critica o
   del que sale en su defensa. Un ministro respondiendo a la oposición no convierte el tuit en
   favorable al Gobierno.
2. **Una decisión del Gobierno de España es PSOE**, aunque la noticia ocurra en una comunidad o
   ciudad gobernada por otro partido. Un tuit que critica los 25 millones que reparte el Gobierno
   central en Ceuta se etiqueta PSOE, no PP.
3. **Lo viral no es un censo aparte.** El modo «100 RT o más» es un subconjunto de la misma
   descarga. Si lo presentas como fuente distinta, estás describiendo mal el proyecto.
4. **La brecha viral no se calcula con muestras cortas.** Solo se dibujan flechas para los medios
   con al menos 200 tuits con lado claro en las dos series. En la serie de 66 medios, de 55
   candidatos solo 20 pasaron el corte. Una flecha desde una muestra corta miente.
5. **Podemos se agrupa en Sumar en el agregador.** Eso es una agrupación para calcular bloques, no
   la afiliación real del actor en la fecha del tuit. No lo mezcles con la taxonomía histórica.
6. **La confianza no es una probabilidad.** `alta`, `media` y `baja` se mapean a 0,9, 0,7 y 0,5.
   Son etiquetas de revisión, no probabilidades calibradas. No se pueden promediar como si lo
   fueran.

## Defectos conocidos, dichos sin adornos

Están comprobados y conviene tenerlos presentes antes de presentar cualquier resultado:

- **El clasificador base no envía la fecha del tuit.** Una sonda local interceptó la llamada y
  confirmó `date_sent=false`. Eso impide que el modelo resuelva referencias que dependen del
  momento. Aplica conocimiento de hoy a un tuit de 2019.
- **El clasificador base recorta el texto a 400 caracteres.**
- **La capa contextual fuerza `partido=Psoe`** cuando aplica una revisión. Puede confundir el
  partido criticado con un beneficiario indirecto. Sus 601 cambios no son 601 mejoras verificadas.
- **Los JSONL no guardan la versión del modelo** que respondió. Hay filas de modelos distintos
  mezcladas sin marcar.
- **La API de twitterapi.io desplaza `until`.** Una consulta `since:D until:D+1` devuelve también
  tuits del día siguiente, y se paga el doble de lo útil. Por eso se guarda todo y se marca con
  `en_muestra` si cae en un día muestreado.
- **Hay un hueco de cobertura sin explicar** en `DiarioSabemos` con twitterapi.io: recuperó 637
  tuits frente a 2.538 con Apify. Antes de extrapolar a 2018 hay que explicarlo.
- **No es un censo.** La serie histórica son hasta 100 tuits por medio y mes. 100 meses así son
  602.906 filas, no los nueve años de producción real de 66 medios.

## Lo que está pendiente

Ordenado por lo que más desbloquea:

1. **Ejecutar el plan de validación del clasificador**, que está escrito y sin empezar:
   `docs/plans/2026-09-27-validacion-clasificador.md`. Propone separar los campos semánticos
   (partido objetivo, dirección del mensaje, voz y encuadre del medio), usar Jev como filtro amplio
   antes de la clasificación fina y comparar cuatro variantes del juez con puertas de parada.
2. **Explicar el hueco de `DiarioSabemos`** o documentar la cobertura desconocida por medio y mes.
3. **Decidir si se publica la capa contextual** como procedencia separada, con sus límites.
4. **Llevar la fecha al clasificador**, que es la causa raíz de varios errores históricos.

## Trampas que ya han costado tiempo

- **El coste se acumula, no se reemplaza.** Los ficheros `costes_*.jsonl` guardan totales
  acumulados, no incrementos. Si sumas las líneas, inflas la cifra. La buena es la última.
- **`createdAt` no es ISO.** Viene como `Fri Oct 24 23:33:20 +0000 2025`. Cortarlo con `[:10]` da
  `Fri Oct 24` y rompe en silencio cualquier agrupación por mes.
- **Cuidado con `str.capitalize()`**: convierte `PSOE` en `Psoe` y las comparaciones contra
  `{"PSOE", "Sumar"}` dan cero sin lanzar ningún error.
- **El operador `list:<id>` no funciona en el actor de Apify** (sí en twitterapi.io).
- **En el actor de Apify, `(A OR B)` rompe el filtro de fechas** y devuelve tuits de hoy. Un solo
  término por consulta, sin paréntesis.
- **Un fichero final vacío significa consulta procesada**, no ausencia demostrada de tuits.

## Coste real, medido

Ninguna cifra es una estimación de tarifa. Todas salen de un libro de coste del propio proceso.

**Censo viral:** 21,41 USD de descarga con Apify, más 1,05 USD de los cuatro programas añadidos
después, más 27,13 USD de clasificación acumulada en `costes_ia.jsonl`.

**Serie histórica:**

| Concepto | Histórico | XV Legislatura | Total |
| --- | --- | --- | --- |
| Descarga (twitterapi.io) | 57,85 USD | 33,02 USD | 90,87 USD |
| Clasificación (Gemini 3.7 Flash) | 52,84 USD | 28,79 USD | 81,63 USD |
| Reclasificación contextual | incluida abajo | incluida abajo | 1,16 USD |
| **Total** | | | **173,67 USD** |

## Cómo verificar que lo que dices es verdad

Antes de afirmar cualquier cifra, compruébala en su fuente. Las comprobaciones que ya existen:

```bash
# Las pruebas de datos y de mapa de la web (6 pruebas, consistencia, no calidad semántica)
python3 -B scripts/test_site_data.py

# La web contra el sitio publicado, en un navegador real
uv run --with playwright python3 scripts/check_site.py

# El recuento de los dos corpus, que debe dar 602.906 filas y 155.922 políticos
wc -l ~/typesafe-lab/politica/medios/polarizacion/*/clasificado_contextual.jsonl
```

Y la regla que resume todo: **una cifra que no has leído de un fichero no es una cifra, es un
recuerdo.** Los recuentos de este documento están verificados y los puedes reproducir.

## Convenciones de escritura

- Todo el texto de cara al público va **en español**.
- **Sin guiones** en la prosa. Ni palabras compuestas con guion ni guiones como separadores.
- Las tablas están bien en el README y en los documentos; en Telegram no, porque se rompen.
