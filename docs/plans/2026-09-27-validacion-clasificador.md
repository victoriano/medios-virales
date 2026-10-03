# Validación de la siguiente clasificación Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Probar si una clasificación candidata con Jev mejora la publicada, sin sobrescribir datos, confundir neutralidad con incertidumbre ni lanzar todavía el corpus completo.

**Architecture:** Evaluación aislada, con una referencia congelada de producción, un contrato semántico explícito, comparaciones controladas y un conjunto final reservado. Separar la dirección del mensaje, la voz que la expresa y el encuadre del medio. Generar versiones paralelas y autorizar la publicación por separado.

**Tech Stack:** Python y unittest, JSONL, API TypeSafe, fichas factuales fechadas, agregador estático existente y revisión independiente de casos.

Estado: plan revisado, no implementación del clasificador. Las rutas y comandos de implementación propuestos más abajo todavía no existen. No se han realizado llamadas de clasificación ni cambios en producción durante esta revisión.

## 1. Hallazgos verificados el 27 de septiembre de 2026

1. El proceso publicado no es el antiguo v3 de Jev. `/srv/medios` está en el commit `cb2fe42`. `scripts/build_legislatura_data.py` utiliza los archivos `clasificado_contextual.jsonl` de estas dos carpetas:
   * `/home/victoriano/typesafe-lab/politica/medios/polarizacion/historico_io_100_may2018_aug2023`
   * `/home/victoriano/typesafe-lab/politica/medios/polarizacion/legislatura_xv_io_100`
2. Se han leído 602.906 registros, sin IDs repetidos entre esas dos fuentes. La serie contiene 155.922 clasificados como políticos. No es un censo de todos los tuits publicados: es una muestra temporal, hasta 100 por medio y mes.
3. La auditoría anterior de 200 corresponde al CSV de virales de 2025 y 2026. Incluye 111 PSOE, 71 PP, 11 Sumar y 7 Vox. Solo 8 IDs están en la serie actual y solo una de las ocho correcciones propuestas está entre esos 8. No se puede trasladar a la serie actual la tasa de error estimada en esa auditoría.
4. El clasificador base real está en `polarizacion/clasificar_legislatura_xv.py`. Su llamada incluye texto, pero no fecha. Una sonda local que interceptó la llamada, sin conexión a la API, confirmó `date_sent=false`. Además, `load_tweets` recorta a 400 caracteres. El modelo configurado en el script es Gemini 3.7 Flash; los JSONL no conservan por fila la versión de modelo que respondió.
5. Ese prompt contiene la regla general «Gobierno o ministerio = PSOE». Es insuficiente para una serie histórica y para atribuir responsabilidades en coaliciones. La fecha no puede resolverse mediante conocimiento actual aplicado hacia atrás.
6. El script solicita motivos, pero el parser no los conserva. La confianza se obtiene mapeando alta/media/baja a 0,9/0,7/0,5: no son probabilidades calibradas.
7. La revisión contextual posterior se centra en figuras relacionadas con el PSOE. Además de preguntar exclusivamente por el efecto sobre ese partido, `aplicar_reclasificacion_contextual.py:46–51` fuerza `partido="Psoe"` cuando aplica una revisión política. Esto puede confundir al partido criticado o defendido con un beneficiario indirecto. La capa debe figurar en la procedencia de la referencia y evaluarse con casos que separen ambos conceptos; sus 601 cambios no son 601 mejoras verificadas. No debe darse por supuesto que el rendimiento de otros partidos sea equivalente.
8. El agregador convierte Podemos en Sumar. Una agrupación para calcular bloques no debe confundirse con la afiliación real del actor en la fecha del tuit.
9. Hay cambios locales del mapa pendientes de publicación. El JSON de desarrollo difiere del publicado. La evaluación debe congelar ambos por separado y comparar etiquetas usando el mismo agregador.
10. La suite existente `python3 -B scripts/test_site_data.py` ha superado sus 6 pruebas. Comprueba consistencia de datos y mapa, NO calidad semántica del clasificador.

## 2. Contrato semántico antes de optimizar prompts

No basta con cambiar todas las declaraciones a neutro. La mejora podría parecer excelente en los ocho errores conocidos y borrar críticas verdaderas.

### Campos separados

* `politica`: presencia de política española. Un rechazo del filtro es distinto de una noticia política neutral.
* `entidades`: personas e instituciones realmente identificadas, afiliación y responsabilidad con vigencia temporal.
* `partido_objetivo`: partido al que se dirige la crítica o defensa, conforme a la convención elegida por Victoriano. No copiar automáticamente el partido del hablante o de la ciudad.
* `direccion_mensaje`: beneficia, perjudica, neutro, mixto o indeterminado, siempre respecto al objetivo.
* `voz`: redacción, entrevistado, cargo político, periodista de opinión, otra fuente o no identificable.
* `encuadre_medio`: apoyo/crítica explícitos, atribución descriptiva, mixto o no determinable. Publicar una cita no prueba adhesión del medio.
* `evidencia`: fragmento del tuit que sustenta la señal o identificador del contexto utilizado; nunca inventarlo.
* `evidencia_suficiente`: permite distinguir información ausente de neutralidad genuina.

El partido y la dirección deben constituir una decisión conjunta válida. Varias preguntas independientes dentro de una llamada de Jev no garantizan coherencia condicional. Usar una elección conjunta de pares permitidos o una segunda llamada condicionada explícitamente al objetivo; medir coste y errores de ambas alternativas en desarrollo. Las preguntas de voz e incertidumbre son controles, no reglas automáticas de polaridad.

### Reglas propuestas para evaluar

* Un anuncio o trámite sin valoración no se vuelve favorable porque lo diga un ministro.
* Un ataque explícito puede aparecer como cita. Se registra su orientación y su voz, pero no se convierte por ello en opinión propia de la redacción.
* El efecto reputacional de una mala noticia y el encuadre editorial no son equivalentes. Registrar ambos permite comprobar qué métrica responde a la intención del proyecto.
* Una noticia con aspectos favorables y desfavorables se marca como mixta, no como neutra por ignorancia ni se fuerza al primer sentimiento encontrado.
* Una imagen inaccesible, un enlace sin texto o una identidad ambigua produce indeterminado o revisión, no neutro fiable.
* La falta de insultos no demuestra neutralidad: también existen insinuación, ironía, elogio y marcos selectivos.
* Un tribunal no es automáticamente un rival político y un crítico interno no representa automáticamente al partido en cada intervención.
* Una relación con un partido no basta para transferir a ese partido cualquier valoración sobre la persona.

Durante el piloto se calculan dos lecturas: dirección del mensaje y encuadre explícito del medio. No imponer silenciosamente la segunda como sustituto de la primera. Resolver la frontera con ejemplos concretos antes de sellar las etiquetas de referencia. Un desacuerdo de definición no se contabiliza como fallo del modelo hasta resolverlo.

## 3. Contexto útil sin filtrar la respuesta

Ficha compacta por tuit, con un límite explícito de tamaño y recuperación solo cuando falte información:

* Fecha del tuit y texto íntegro disponible.
* Identidad de cada actor, partido, cargo, institución y ámbito.
* Intervalos de vigencia y fuentes de cada relación.
* Hechos relevantes para entender referencias o alusiones, con fecha del hecho y fecha de publicación de la fuente.
* Incertidumbres o contradicciones sin resolver.

No incluir «este actor beneficia al PSOE», «este medio es de derechas» ni la etiqueta previa. Son respuestas camufladas como contexto. No introducir desenlaces conocidos después del tuit. Una fuente posterior solo puede documentar hechos ya vigentes y debe dejar clara esa distinción.

La extracción o recuperación de contexto se hace sin acceso al resultado esperado. Los tuits y artículos son datos no confiables, nunca instrucciones. Separar texto del tuit de material externo. Evaluar por separado el modo texto y el modo con contexto adicional; no dar al juez un artículo que el candidato no pudo ver y llamar a eso comparación equivalente.

No enviar nombre del medio ni métricas de viralidad por defecto. Conservarlos para estratificar y agregar. Si un dato de autoría es imprescindible para entender una cita, incorporar el rol factual mínimo y medir la dependencia de identidad.

Conservar el partido histórico literal. La agrupación de Podemos/Sumar u otros partidos para bloques es una configuración versionada separada. No cambiar a la vez la taxonomía histórica y la fórmula del mapa sin descomponer sus efectos.

## 4. Arquitectura de filtrado antes de la clasificación fina

Ajuste propuesto por Victoriano: utilizar Jev primero como filtro amplio para reducir el trabajo posterior a tuits candidatos a favorecer o perjudicar a un partido, directa o indirectamente. No realizar contexto profundo ni auditoría exhaustiva sobre las 602.906 entradas.

Recuento comprobado con las etiquetas actuales, no como resultado de un nuevo filtro:

* 602.906 tuits en total.
* 155.922 etiquetados como políticos: 25,86 % del total.
* 121.322 políticos con dirección beneficia o perjudica, incluido objetivo múltiple o no concreto: 20,12 % del total.
* 112.279 con esa dirección y partido de los bloques concretos: 18,62 % del total.

Estos recuentos sugieren el orden de magnitud del ahorro, pero la referencia contiene errores. No usar solo sus 112.279 positivos para seleccionar el universo de la candidata: se perderían falsos negativos y atribuciones indirectas que queremos recuperar.

### Etapa A: cribado barato y permisivo con Jev

Pregunta operativa: «¿Hay indicios de que este mensaje pueda favorecer o perjudicar la imagen de un partido político español o de sus responsables, directa o indirectamente, o falta información para descartarlo con seguridad?».

Separar candidatos claros, descartes claros y casos que necesitan contexto. No exigir ya una postura editorial explícita, un nombre de partido, una dirección definitiva o un objetivo identificado. Las alusiones a personas, gobiernos, casos y adversarios también pueden ser candidatas. Noticias judiciales o económicas con vínculo partidista plausible pueden pasar aunque finalmente resulten neutras.

Entradas mínimas: fecha, texto íntegro disponible y un glosario factual compacto de entidades con vigencia temporal. No construir una ficha costosa por cada tuit para poder filtrarlo. Desconocimiento de una entidad, imagen inaccesible o dependencia de contexto no equivale a descarte.

Regla de operación: pasan candidatos y dudosos; se excluye de la clasificación fina solo aquello sin indicios relevantes y con evidencia suficiente para sostener ese descarte. Guardar todos los originales y decisiones, sin borrar filas. Calibrar umbrales por recuperación y reducción conjunta; no adoptar 0,5 o una confianza arbitraria por costumbre.

### Etapa B: resolver contexto solo donde haga falta

Sobre los que pasan, identificar partido objetivo y posible efecto. Resolver referencias indirectas mediante fichas reutilizables por entidad, caso y fecha. Los casos fáciles no necesitan una búsqueda por tuit. Los ambiguos se derivan a recuperación de evidencia o a revisión por un modelo con capacidad contextual.

### Etapa C: clasificación fina automática y auditoría selectiva

La clasificación detallada se hace automáticamente sobre candidatos; la revisión humana o por modelo potente se concentra en una muestra de control, desacuerdos y casos difíciles. No se propone revisar manualmente todos los candidatos. Mantener separado objetivo directo, beneficiario indirecto y encuadre editorial.

### Validación específica del filtro

Antes de la comparación fina, reutilizar los casos de regresión y los pares mínimos para exigir que el filtro conserve ataques, defensas e insinuaciones claras, incluidas las indirectas. En el examen reservado evaluar también los descartes, no únicamente los que pasan:

* Tasa de recuperación de candidatos reales, con especial atención a los indirectos y a los partidos menos frecuentes.
* Fracción del corpus que llega a clasificación fina, contexto y revisión.
* Auditoría ciega aleatoria de descartes y revisión adicional de descartes con nombres, casos o señales políticas. Mantener separadas la muestra aleatoria y la muestra dirigida al estimar tasas.
* Estimación del número de candidatos perdidos en el conjunto descartado, con incertidumbre y pesos. Una fracción pequeña de errores puede esconder muchos tuits si los descartes son muy numerosos.
* Comparación entre cascada y clasificación fina sin filtro en una muestra pequeña común, para medir cuánto error añade el cribado.

Objetivo de diseño orientativo: recuperar al menos el 99 % de los candidatos reales, sin presentar una muestra pequeña como demostración de ese nivel. Si el filtro pierde señal indirecta o muestra diferencias sistemáticas por partido o época, relajar el umbral antes de buscar más reducción. La reducción observada no es suficiente para aprobar.

Solo después de validar el cribado se dimensiona el lote completo. Registrar coste total del filtro, resolución de contexto y clasificación, no únicamente coste por candidato. Esta modificación afecta al plan; no se ha ejecutado un nuevo filtro.

## 4 bis. Comparación controlada de la clasificación fina

Referencia A: etiquetas publicadas congeladas, incluida la capa contextual. Sin nuevas llamadas ni reinterpretación retroactiva de su confianza.

Para separar el efecto de la regla del efecto del contexto, probar un diseño de cuatro variantes de Jev sobre los mismos casos:

* J00: adaptación tipada de la rúbrica vigente, texto y fecha.
* J10: rúbrica revisada, el mismo texto y fecha.
* J01: rúbrica vigente, más ficha factual fechada.
* J11: rúbrica revisada, más la misma ficha factual fechada.

Fijar modelo, campos, versión de preguntas y orden de ejecución aleatorizado. La comparación entre estas cuatro variantes permite estudiar la rúbrica y el contexto. La comparación de cualquiera con A mide el cambio de sistema completo: no permite atribuirlo solo al prompt porque también cambia el modelo.

J00 es una adaptación para Jev, NO una reproducción idéntica del antiguo Gemini. No alterar silenciosamente campos entre variantes. Hacer controles de integridad de los estados enviados.

Jev entrega etiquetas y distribuciones, no explicaciones generadas. Guardar preguntas, estados, respuestas completas, modelo devuelto y tokens. La explicación en lenguaje natural se obtiene por revisión separada y no cuenta como evidencia por sí misma.

## 5. Batería rápida, con puertas de parada

### Prueba 0. Seguridad y datos, sin API

* Leer baseline y candidato desde rutas distintas y bloquear salida a cualquier ruta de producción.
* Hash de fuentes, scripts de procedencia, rúbrica, contexto y agregador antes y después.
* Igualdad exacta del universo de IDs en una versión completa. En un piloto, manifest explícito de IDs seleccionados.
* Un resultado correcto por ID, sin pérdidas o duplicados. Error de API no equivale a neutralidad.
* Reanudar sin duplicar; cambiar prompt, contexto o modelo invalida la cache aunque el ID sea igual.
* Verificar que fecha, texto y objetivo llegan a la llamada; detectar cualquier recorte en vez de truncarlo silenciosamente.
* Registrar que los campos históricos ausentes son desconocidos; no inventar probabilidades ni motivos retrospectivos.
* Simular fallos de red y respuestas incompletas únicamente en tests locales, marcados como fixtures. Nunca presentarlos como respuestas reales.

Criterio: 100 % de invariantes técnicos. Un fallo bloquea todas las llamadas posteriores.

### Prueba 1. Regresión real de 32 casos

* Reutilizar las 8 correcciones propuestas de la auditoría antigua como casos de desarrollo, no como una estimación representativa ni verdad humana certificada.
* Añadir 24 controles antes correctos que protejan elogios, ataques, atribución de objetivo y neutralidad. Diversificar partidos, voz y medio. La auditoría antigua solo tiene 4 controles de Vox con señal clara y sin alerta de partido: no inventar cuotas que no existen.
* Revisar primero que las etiquetas de referencia sean coherentes con el contrato elegido. Los casos que requieran artículo se marcan como tales y se evalúan en un modo separado.

Criterio tras sellar la referencia: corregir los 8 problemas sin romper los 24 controles. Si no, detenerse y mostrar ejemplos. No retocar las etiquetas de referencia para favorecer la variante ganadora.

### Prueba 2. 24 pares mínimos, 48 entradas sintéticas

Son pruebas de comportamiento con expectativas declaradas, NO datos reales ni una tasa de acierto poblacional. Conservar cada pareja como unidad y aislarla de ejemplos del prompt.

1. Anuncio descriptivo frente al mismo anuncio con elogio explícito: cambia la dirección apropiadamente.
2. Anuncio descriptivo frente al mismo anuncio con crítica explícita: cambia en sentido contrario.
3. Cambiar el partido de quien hace un anuncio puramente informativo: no crea una dirección.
4. Intercambiar partidos en una crítica ficticia perfectamente simétrica: cambia el objetivo, no la severidad.
5. Cargo de A ataca a B frente a cargo de B ataca a A: no atribuir el ataque al hablante como perjudicado.
6. Mismo apellido con identidades distintas resueltas por la ficha: no transferir afiliación por coincidencia textual.
7. Mismo texto sobre el Gobierno con dos fechas y fichas de responsables distintas: respetar el contexto temporal suministrado.
8. Ministerio de una coalición con responsable concreto frente a decisión atribuida al conjunto: no asignar todo por defecto al partido mayoritario.
9. Decisión estatal en una ciudad frente a decisión de su ayuntamiento: atribuir al responsable, no al lugar.
10. Mismo contenido con medio oculto o con otra identidad de medio: invariancia salvo información factual imprescindible explicitada.
11. Añadir hechos verdaderos pero irrelevantes a la ficha: no mover la etiqueta.
12. Identidad resuelta frente a identidad insuficiente: en la segunda baja la cobertura automática o aparece revisión, no certeza inventada.
13. Añadir al recuperador un desenlace posterior al tuit: el filtro temporal lo excluye antes de clasificar.
14. Cita crítica atribuida frente a adhesión explícita de la redacción: diferenciar voz y encuadre aunque la crítica citada siga existiendo.
15. «X acusa de corrupción» frente a «se ha acreditado corrupción»: conservar atribución y estatus de la afirmación.
16. Elogio literal frente a ironía inequívoca del mismo contenido: detectar la inversión o remitir a revisión.
17. Afirmación frente a negación explícita: no perder la negación.
18. Dos valoraciones contrapuestas frente a una sola: distinguir mixto de unilateral.
19. Texto informativo neutral frente a publicación sin información visible: distinguir neutro de indeterminado.
20. Mismo tuit con 99 o 100 RT: la etiqueta no cambia; sí puede cambiar la pertenencia al filtro visual.
21. Mismo estado con opciones en orden inverso: estabilidad de la etiqueta en casos inequívocos.
22. Paráfrasis que conserva significado: estabilidad en casos inequívocos.
23. Instrucción hostil dentro de una cita: tratarla como contenido y no como orden al clasificador.
24. Desambiguación decisiva después del carácter 400: el texto íntegro evita decidir a partir del fragmento truncado.

Criterio: las invariantes críticas de fecha, objetivo, simetría, evidencia ausente y seguridad no admiten fallos. Para las restantes, revisar todo desacuerdo y aspirar al menos al 95 % de concordancia; con tan pocos pares es un filtro de fallos obvios, no una garantía estadística.

La batería inicial contiene 80 entradas: 32 reales y 48 sintéticas. Cuatro variantes suponen como máximo 320 llamadas si cada entrada usa una llamada por variante; el coste aumenta si se decide un segundo paso condicionado. Empezar con una sonda de 12 llamadas reales y detenerse si falla esquema, versión, consumo o semántica básica. Ninguna de estas llamadas se ha realizado todavía.

### Prueba 3. Desarrollo equilibrado, 120 tuits reales nuevos

Diez casos por combinación de los cuatro partidos principales y las tres direcciones previas, siempre que existan. Cubrir épocas y medios. La etiqueta previa se utiliza solo para seleccionar, nunca se muestra al juez.

Esta muestra diagnostica partidos minoritarios, ayuda a calibrar umbrales y permite elegir variante. No se usa para anunciar la precisión final ni se mezcla con la muestra reservada. Incluir inspección específica de críticos internos, coaliciones, ironía y múltiples objetivos.

Si una cuota es imposible, registrarlo y sustituir por una regla explícita antes de mirar resultados; no rellenarla con ejemplos duplicados.

### Prueba 4. Examen reservado de 240 tuits de la serie actual

Extraer y sellar antes de ajustar prompts:

* Tres épocas: 2018 y 2019; 2020 a 2022; 2023 a 2026.
* Cuatro estratos de etiqueta previa, exhaustivos y mutuamente excluyentes: no político; político con partido concreto y beneficia; político con partido concreto y perjudica; resto político, incluidos neutros, varios y ninguno.
* Veinte casos aleatorios por cada cruce: doce estratos y 240 casos.

Registrar semilla, tamaños de estrato y probabilidades de inclusión. Una tasa global se pondera con los tamaños reales. Las medias simples de esta muestra deliberadamente equilibrada no estiman el error total.

Sellar primero el examen, después excluir del desarrollo sus IDs, duplicados cercanos y el mismo acontecimiento cuando genere contaminación evidente. Conservar el diseño de selección del examen. Revisar agrupación por acontecimiento en los intervalos: veinte titulares sobre el mismo caso no equivalen a veinte casos independientes.

Evaluar solamente A y la variante ganadora, sin volver a ajustar sobre el examen. Conservar una salida indeterminada si no hay evidencia suficiente. No convertir el acuerdo de varios jueces del mismo modelo en verdad garantizada.

### Prueba 5. Estabilidad y controles de modelo

En 40 casos de desarrollo, repetir tres veces el estado idéntico. Registrar la posibilidad de cache: repetición idéntica no proporciona juicios independientes del error. Repetir también el orden de opciones y variaciones equivalentes del texto dentro de los pares de la prueba 2.

No usar `uid`: la API de TypeSafe lo rechaza según las pruebas documentadas de la integración. Guardar versión efectiva, distribución, etiqueta y margen entre opciones. Si la versión cambia durante el piloto, separar ejecuciones.

Criterio orientativo: al menos 95 % de acuerdo en casos inequívocos y ningún fallo sistemático por partido. Los casos inestables no se publican automáticamente como seguros.

### Prueba 6. Agregados y mapa sin publicar

* Comparar numerador, denominador, porcentaje de cobertura, descartes e indeterminados, no solo el índice horizontal.
* Mantener mismo conjunto de medios para la comparación pareada y mostrar aparte cuáles cruzan el umbral global de más de 50 con lado claro.
* Comprobar eje Y, mediana de RT, filtros Todos y 100 RT o más, periodos y tratamiento de muestras pequeñas.
* Comparar por separado cambios de etiqueta, cambios de composición y cambios de agrupación histórica.
* Usar mini corpus ficticio declarado para pruebas exactas de agregación. No tratar la estimación sobre 240 casos como un ranking preciso de 66 medios.
* Para una vista de impacto con datos reales sin reclasificar todo, comparar las versiones sobre la misma muestra y mostrar incertidumbre. Una proyección ponderada no es el nuevo índice observado del corpus completo.

Que todos los medios se muevan hacia el centro, o cada uno hacia su extremo, no demuestra calidad. Son patrones para investigar, no criterios de aprobación.

## 6. Criterios para avanzar

### Puerta de piloto

* Invariantes técnicas satisfechas y ninguna modificación del baseline.
* Regresión resuelta y controles conservados bajo la rúbrica sellada.
* Sin fallos críticos de cronología, objetivo o seguridad.
* Coste y tiempo medidos, no extrapolados de una tarifa antigua sin verificar.

### Puerta de ampliación

En el conjunto reservado reportar conjuntamente:

* Error de filtro político y falsos negativos entre lo antes descartado.
* Error conjunto de partido y dirección; no solo dirección con partido regalado por la referencia.
* Precisión de la señal emitida y recuperación de ataques/elogios verdaderos.
* Falsos positivos de beneficia y perjudica por separado.
* Neutralizaciones erróneas, casos mixtos e indeterminados.
* Cobertura automática y riesgo condicionado a esa cobertura.
* Resultados por partido y época, con tamaños y límites de incertidumbre.
* Diferencia pareada de errores respecto a A, ponderada por diseño; intervalo que respete la agrupación por acontecimiento cuando sea viable.

La hipótesis de mejora exige menos errores sin conseguirlo simplemente suprimiendo la señal difícil. Fijar en desarrollo objetivos orientativos de precisión de señal del 95 % y recuperación del 90 %, pero no interpretar el valor puntual de una muestra pequeña como garantía. Los umbrales operativos de probabilidades se ajustan únicamente con desarrollo.

Para justificar el lote completo, buscar evidencia positiva de mejora pareada y ausencia de regresiones materiales en recuperación y en los grupos críticos. Si el intervalo de la diferencia incluye ausencia de mejora, o un grupo tiene pocos casos, el resultado es inconcluso. No aprobar por conveniencia ni añadir muestras una a una hasta conseguir significación. Diseñar una evaluación posterior independiente si hace falta más potencia.

Las ocho correcciones antiguas y los pares sintéticos son pruebas de regresión: nunca se suman al examen como si fueran observaciones aleatorias.

### Puerta de publicación

Incluso si el piloto pasa, la reclasificación completa y la publicación son decisiones separadas. Primero producir una candidata íntegra en paralelo, comprobar cobertura de todos los IDs, diffs y agregados, y conservar la anterior seleccionable y recuperable. No cambiar el puntero de producción sin autorización.

## 7. Implementación futura en pasos verificables

No ejecutar estas tareas durante la revisión del plan. No reutilizar los scripts antiguos que escriben sobre el CSV principal.

### Tarea 1: fijar entradas y referencia

**Objective:** Poder reproducir exactamente la comparación.

**Files:** Crear `scripts/evaluation/baseline.py`, `tests/test_evaluation_baseline.py` y `experiments/direction_vnext/baseline_manifest.json`.

1. Escribir test que intenta dar una salida igual a una ruta baseline y exige rechazo.
2. Ejecutar `python3 -m unittest discover -s tests -p 'test_evaluation_baseline.py' -v`; debe fallar antes de implementar.
3. Implementar manifiesto con ruta, tamaño, hash, universo y procedencia; copiar snapshots a un directorio nuevo, sin reemplazar existentes. Incluir los JSON publicados y las capas contextuales.
4. Repetir el test y validar hashes. No hacer enlaces duros que puedan mutar la supuesta copia.

### Tarea 2: contrato y contexto

**Objective:** Evitar confundir desconocimiento, neutralidad y postura.

**Files:** Crear `scripts/evaluation/contract.py`, `tests/test_evaluation_contract.py`, `experiments/direction_vnext/rubric.md` y `context_schema.json` en esa carpeta.

1. Tests fallidos para fecha ausente, texto truncado sin aviso, evidencia que no existe, partido/dirección incompatibles y contexto posterior.
2. Implementar validación de esquema y de pares permitidos. Jev no genera las justificaciones.
3. Ejecutar `python3 -m unittest discover -s tests -p 'test_evaluation_contract.py' -v` y exigir éxito.

### Tarea 3: preparar suites y separar desarrollo del examen

**Objective:** Tener ejemplos evaluables antes de ajustar el clasificador.

**Files:** Crear `scripts/evaluation/sample.py`, `tests/test_evaluation_sampling.py`, `experiments/direction_vnext/regression.jsonl`, `pairs.jsonl`, `development.jsonl` y `holdout_manifest.json`.

1. Tests fallidos para IDs repetidos, cruce entre conjuntos, cuotas y pesos incoherentes.
2. Preparar las 32 regresiones y los 24 pares con revisión y expectativas explícitas. Seleccionar y sellar primero el examen de 240.
3. Ejecutar `python3 -m unittest discover -s tests -p 'test_evaluation_sampling.py' -v`.
4. Guardar respuestas de referencia del examen en ubicación separada y no accesible al proceso que construye contexto o ajusta prompts.

### Tarea 4: runner de piloto

**Objective:** Ejecutar experimentos pequeños, reproducibles y con presupuesto limitado.

**Files:** Crear `scripts/evaluation/run.py` y `tests/test_evaluation_runner.py`.

1. Tests fallidos para 429, respuesta parcial, cambio de modelo, cache obsoleta y agotamiento de presupuesto.
2. Implementar salida en directorio nuevo, registro completo, reanudación por clave de ID + modelo + prompt + contexto + texto y concurrencia acotada.
3. Reservar presupuesto antes de enviar peticiones concurrentes, incluyendo reintentos y límites de tamaño. No comprobarlo solo al terminar lotes.
4. Ejecutar los tests sin red; después realizar la sonda real de 12 llamadas con límite explícito.
5. Solo si pasa, ejecutar las cuatro variantes del primer conjunto de 80.

### Tarea 5: evaluación ciega

**Objective:** Comparar calidad sin contaminar al juez con las etiquetas candidatas.

**Files:** Crear `scripts/evaluation/evaluate.py`, `tests/test_evaluation_metrics.py` y `experiments/direction_vnext/reports/`.

1. Tests fallidos con un mini conjunto artificial cuya matriz de errores, pesos y cobertura sean conocidos.
2. Implementar comparación pareada, matrices, abstenciones, grupos y lista de desacuerdos.
3. Revisores ciegos a versión, etiqueta previa e ideología supuesta del medio; registrar modelo efectivo cuando esté disponible, sin atribuir uno no verificado.
4. Ejecutar tests, elegir variante en desarrollo y abrir el examen una sola vez.

### Tarea 6: impacto aislado y decisión

**Objective:** Comprobar que mejorar etiquetas no rompe la lectura del mapa.

**Files:** Crear `scripts/evaluation/impact.py` y `tests/test_evaluation_impact.py`. Reutilizar funciones puras de `scripts/build_legislatura_data.py`, sin modificar ni ejecutar su escritura sobre producción.

1. Tests fallidos con mini corpus sintético para pérdida de señal, partidos agrupados, mediana de RT, 99/100 RT y umbral global de inclusión.
2. Implementar dos salidas separadas con el mismo agregador y mismo universo comparado.
3. Ejecutar `python3 -m unittest discover -s tests -p 'test_evaluation_*.py' -v`.
4. Entregar ejemplos corregidos y regresiones, métricas con límites, coste medido y recomendación de continuar o parar. No hacer commit, push, despliegue ni lote completo sin autorización específica.

## 8. Entregable mínimo del piloto

Un informe que permita decidir con ejemplos, no solo con una puntuación:

* Qué corregimos y qué rompemos, con enlaces originales y evidencia.
* Comparación A/J00/J10/J01/J11 en desarrollo y A/ganadora en examen reservado.
* Precisión, recuperación, neutralizaciones y cobertura con incertidumbre.
* Errores por partido, época y tipo de contenido.
* Consumo real, versión efectiva del modelo y tiempo.
* Estado de integridad de la referencia y criterio explícito de continuar, rechazar o resultado inconcluso.

La revisión actual solo ha producido este plan, inspección de procedencia, conteos de universo e intersección y pruebas locales del sistema existente. Todavía no hay evidencia de que la nueva rúbrica o Jev mejoren la clasificación publicada.
