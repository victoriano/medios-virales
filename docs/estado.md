# Estado del trabajo y pendientes

Foto del proyecto a **5 de octubre de 2026**. Sirve para saber qué está hecho, qué está a medias y
qué decisiones siguen abiertas, sin tener que reconstruirlo leyendo el historial de git.

Si vas a continuar el trabajo, lee antes `AGENTS.md`. El método detallado está en `docs/metodo.md`.

## Resumen en una línea

El censo viral y el mapa de nueve años están publicados y funcionando. La validación del
clasificador tiene hechas sus fases sin coste y **espera aprobación para las llamadas de pago**.

## Qué está publicado y qué no

| | Estado |
| --- | --- |
| Web en medios.victoriano.me | Funcionando, sirviendo el commit `6ec417e` del 3 de octubre |
| Censo viral (21.489 tuits) | Clasificado y publicado |
| Serie histórica (602.906 filas) | Clasificada, agregada y publicada en la web |
| Capa de reclasificación contextual | Aplicada y publicada |
| Mejoras del mapa (eje Y absoluto y mediana de retuits) | Publicadas, comprobadas en navegador el 5 de octubre |
| Validación del clasificador | **Fases sin coste hechas**, ver `experiments/direction_vnext/README.md` |
| Fecha en el clasificador | **Corregido en el script**, sin reclasificar el corpus |

## Mejoras del mapa publicadas el 3 de octubre

Una tanda de cambios coherentes entre sí que describen mejor lo que el mapa dibuja. Están en el
commit `6ec417e`, que es el que sirve `/srv/medios`:

- **El eje vertical pasó de porcentaje a número absoluto.** Antes mostraba el porcentaje de tuits
  con lado claro; ahora muestra cuántos tuits son. Es más honesto con el tamaño real de la muestra.
- **El tamaño de la burbuja pasó de media a mediana de retuits.** La mediana no se deja arrastrar
  por un tuit desproporcionado.
- **El campo nuevo es `rt_mediana`**, calculado en `scripts/build_legislatura_data.py` sobre las
  filas con lado claro.
- **Las etiquetas del filtro cambiaron** de «Solo lo publicado» y «Solo lo viral» a «Todos los
  tuits» y «100 RT o más». El motivo: lo publicado no era un censo aparte y el nombre invitaba a
  creer que sí, que es justo el malentendido que `AGENTS.md` avisa de no cometer.
- **Pruebas nuevas** en `scripts/test_site_data.py`: comprueban que las métricas exponen `con_lado`
  y `rt_mediana`, que `con_lado` nunca supera el total de tuits, y que en el subconjunto de 100 RT o
  más la mediana no baja de 100 cuando hay muestra.
- **`scripts/check_site.py` extendido** para verificar en un navegador real la escala del eje
  vertical por periodo y serie, el radio esperado de cada burbuja y el contenido de las ayudas.

Ficheros afectados: `README.md`, `scripts/build_legislatura_data.py`, `scripts/check_site.py`,
`scripts/test_site_data.py`, `site/app.js`, `site/index.html`, `site/styles.css` y los dos JSON de
datos del sitio.

## Defectos conocidos

Ninguno bloquea la publicación actual, pero todos afectan a cómo se pueden presentar los resultados.

### Del clasificador

Los defectos 1 a 4 están **corregidos en el script desde el 5 de octubre** (versión de prompt
`fecha_v2`, ver el pendiente 3), pero **siguen presentes en todas las etiquetas publicadas**, porque
el corpus no se ha reclasificado.

1. **No recibe la fecha del tuit.** Comprobado con una sonda que interceptó la llamada:
   `date_sent=false`. Es la causa raíz de varios errores históricos, porque el modelo aplica
   conocimiento de hoy a un tuit de 2019. Ejemplo medido: la referencia etiqueta como Sumar 1.953
   tuits políticos de 2018 a 2021, antes de que el partido existiera.
2. **Recorta el texto a 400 caracteres.** Afecta a 775 de las 602.906 filas.
3. **No conserva los motivos** que pide el prompt.
4. **No guarda la versión del modelo por fila**, así que hay respuestas de modelos distintos
   mezcladas sin marcar.
5. **La confianza no está calibrada.** Alta, media y baja se mapean a 0,9, 0,7 y 0,5, y no son
   probabilidades.

### De la capa contextual

6. **Fuerza `partido="Psoe"`** al aplicar una revisión, lo que puede confundir el partido criticado
   con un beneficiario indirecto. Sus 601 cambios no son 601 mejoras verificadas.
7. **Se centra solo en figuras relacionadas con el PSOE.** No se puede suponer el mismo rendimiento
   en otros partidos.

### De la agregación

8. **Podemos se agrupa en Sumar.** Es una agrupación para calcular bloques, no la afiliación real
   del actor en la fecha del tuit.
9. **El desarrollo y lo publicado pueden diferir.** El 5 de octubre eran idénticos y se congelaron
   los dos por separado en `experiments/direction_vnext/baseline_manifest.json`. Si vuelven a
   divergir, hay que congelarlos de nuevo antes de comparar.

### De la descarga

10. **`twitterapi.io` desplaza el filtro de fechas.** `since:D until:D+1` devuelve también el día
    siguiente y se paga el doble de lo útil. Por eso existe la marca `en_muestra`.
11. **Hueco de cobertura en `DiarioSabemos`** sin explicar: 637 tuits frente a 2.538 con Apify.
12. **La cobertura por medio y mes no está auditada.** Hasta que lo esté, la serie histórica es una
    muestra, nunca un censo.

## Pendientes, por orden de lo que más desbloquea

### 1. Ejecutar la validación del clasificador

Es la pieza grande y la que más mejora desbloquea. Tiene plan completo y revisado:

```
docs/plans/2026-09-27-validacion-clasificador.md
```

Lo esencial del plan:

- **Separar los campos semánticos** que hoy van juntos: `politica`, `entidades`, `partido_objetivo`,
  `direccion_mensaje`, `voz`, `encuadre_medio`, `evidencia` y `evidencia_suficiente`. No basta con
  cambiar declaraciones a neutro: eso podría borrar críticas verdaderas.
- **El partido y la dirección como decisión conjunta**, no como dos preguntas independientes dentro
  de la misma llamada.
- **Usar Jev primero como filtro amplio y permisivo**, con la pregunta de si hay indicios de que el
  mensaje pueda favorecer o perjudicar a un partido, directa o indirectamente, o si falta
  información para descartarlo. Pasan candidatos y dudosos. No hacer contexto profundo sobre las
  602.906 entradas.
- **Resolver contexto solo donde haga falta**, con fichas reutilizables por entidad, caso y fecha.
- **Comparar cuatro variantes del juez** sobre los mismos casos: rúbrica vigente o revisada,
  con o sin ficha factual fechada.
- **Puertas de parada y examen reservado.** Evaluar también los descartes, no solo los que pasan,
  porque una fracción pequeña de errores puede esconder muchos tuits si los descartes son muy
  numerosos. Objetivo orientativo: recuperar al menos el 99 por ciento de los candidatos reales.

Recuentos que el plan usa para dimensionar el ahorro, calculados con las etiquetas actuales:

| | Tuits | Porcentaje del total |
| --- | --- | --- |
| Total | 602.906 | 100 % |
| Políticos | 155.922 | 25,86 % |
| Con dirección beneficia o perjudica | 121.322 | 20,12 % |
| Con dirección y partido de los bloques | 112.279 | 18,62 % |

**Estos recuentos no se deben usar para seleccionar el universo de la candidata**, porque la
referencia contiene errores y se perderían falsos negativos.

**Hecho el 5 de octubre, sin ninguna llamada de pago** (detalle en
`experiments/direction_vnext/README.md`): referencia congelada de producción y de desarrollo,
contrato semántico con sus pruebas, rúbrica revisada pendiente de sellar, esquema de la ficha
factual, examen reservado de 240 sellado fuera del repositorio, desarrollo de 120, 24 candidatos a
control y 24 pares mínimos sintéticos. Falta el fichero de la auditoría de 200, del que salen las 8
correcciones de la prueba 1: no está en el VPS. Lo siguiente es la sonda de 12 llamadas, que
necesita aprobación.

### 2. Explicar el hueco de `DiarioSabemos`

O, si no se explica, documentar la cobertura desconocida por medio y mes y no presentar la serie
histórica como censo exhaustivo.

### 3. Llevar la fecha al clasificador

**Hecho en el script, sin reclasificar.** `clasificar_legislatura_xv.py` del taller envía cada tuit
como `TUIT n [AAAA-MM-DD]: texto`, con el texto íntegro, y guarda por fila el modelo que respondió
(`modelVersion`), la versión y el hash del prompt, el motivo y la longitud enviada. Escribe en
`clasificado_fecha_v2.jsonl`, nunca en `clasificado.jsonl`. La regla del Gobierno pasa a ser el
partido que lo presidía en la fecha del tuit. La versión anterior está guardada como
`clasificar_legislatura_xv.antes_fecha_20261005.py` y la sonda sin red como
`test_clasificar_legislatura_xv.py`. Reclasificar el corpus completo costó 81,63 USD la primera vez
y es una decisión aparte.

### 4. Decidir cómo se publica la capa contextual

Hoy se aplica y se cuenta, pero sus límites viven en este documento y no en la web. Opciones: no
publicarla, publicarla como procedencia separada, o marcarla en la interfaz.

## Decisiones abiertas

- **¿Se amplía el corte de retuits?** Un corte de 20 retuits multiplica la descarga: unos 13 dólares
  al mes en 6 medios. El corte de 100 sobreestima el sesgo, así que hay que decidirlo con las cifras
  delante y no por intuición.
- **¿Se rebaja el corte global de inclusión?** Hoy son más de 50 tuits con lado claro. Bajarlo mete
  más medios en el mapa, con muestras que significan menos.
- **¿Se anota la versión del clasificador por fila?** Es barato y resuelve la trazabilidad de los
  JSONL.

## Cómo se publica

```bash
# 1. En el repositorio de trabajo
cd ~/Code/medios-virales
git add -A
git commit -m "Descripción del cambio"
git push

# 2. En el VPS, que es quien sirve la web
cd /srv/medios
git pull
```

La web es estática: no hay build, no hay dependencias y `git pull` es todo el despliegue.

## Trampas de este proyecto

Las que ya han costado tiempo a alguien:

- **Confundir las dos series.** Lo viral no es un censo aparte; es un subconjunto de la misma
  descarga.
- **Sumar las líneas de un fichero de coste.** Son totales acumulados, no incrementos. La cifra
  buena es la última.
- **Contar la muestra por líneas del fichero.** `twitterapi.io` devuelve tuits fuera de los días
  muestreados. Hay que filtrar por `en_muestra`.
- **`str.capitalize()`** convierte `PSOE` en `Psoe` y las comparaciones dan cero sin error.
- **Cortar `createdAt` con `[:10]`**: no es ISO, y rompe en silencio cualquier agrupación por mes.
- **Presentar el mapa de nueve años como un censo.** Es una muestra de hasta 100 por medio y mes.
