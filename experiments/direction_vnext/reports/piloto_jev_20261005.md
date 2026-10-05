# Sonda de 100 llamadas a Jev, 5 de octubre de 2026

Primera llamada real del piloto, aprobada por Victoriano. Una sola variante: rúbrica revisada `r1`
con fecha y texto íntegro, y con ficha factual solo en los pares sintéticos (los tuits reales van
sin ficha). Detalle completo en `piloto_jev_20261005.json`; respuestas crudas en el taller, en
`validacion_vnext/piloto_jev_20261005/resultados.jsonl`.

## Consumo medido

| | |
| --- | --- |
| Llamadas | 100, sin errores ni reintentos |
| Modelo que respondió | `jev-1.13.0` en todas |
| Tokens de entrada | 193.373 |
| Coste | **0,0081 USD** (la estimación previa era 0,0116) |
| Tiempo | 4,1 segundos con 8 hilos |

Composición: 47 entradas de los pares sintéticos (la 13b la rechaza el contrato antes de llamar,
como debe), 24 candidatos a control y 29 tuits de desarrollo.

## Pares mínimos: 19 de 24

Pasan los que miden lo estructural: la misma frase con dos fechas y dos gobiernos (7), el
objetivo frente al hablante (5), la simetría (4), la identidad resuelta por la ficha (6 y 12), la
decisión estatal frente a la municipal (9), la coalición (8), afirmación y negación (17), mixto
frente a unilateral (18), la paráfrasis (22) y el orden inverso de opciones (21). La orden hostil
del par 23 se detecta (0,97) y no se obedece.

Fallan cinco:

| Par | Crítico | Qué pasa |
| --- | --- | --- |
| 19 | sí | Un texto informativo claro sale con evidencia insuficiente (0,38). Ver abajo. |
| 24 | sí | Con el texto recortado y avisado, Jev concluye beneficia. Ignora el aviso. La defensa real es no recortar nunca, que ya hace el clasificador nuevo. |
| 10 | no | Enviar el medio no cambia partido ni dirección, pero sí la voz y la evidencia suficiente. |
| 11 | no | Añadir hechos irrelevantes no cambia partido ni dirección, pero sí la voz. |
| 15 | no | Un hecho que da la redacción sale con voz de otra fuente. |

Las etiquetas de partido y dirección son estables en todos los pares de invariancia; lo que se
mueve son los campos de control.

## La pregunta de evidencia suficiente no sirve todavía

Queda por debajo de 0,5 en 31 de las 100 llamadas, incluidos textos inequívocos. Por eso aparecen
25 incoherencias de contrato: una dirección clara con evidencia insuficiente. El contrato las
registra y no las corrige. Antes de usarla como puerta hay que reescribirla o calibrar su umbral
con desarrollo; 0,5 no vale por costumbre.

## Acuerdo con la referencia, que no es acierto

| | Partido y dirección | Solo partido | Solo dirección | Ninguno |
| --- | --- | --- | --- | --- |
| 24 controles | 9 | 3 | 5 | 7 |
| 29 de desarrollo | 9 | 8 | 6 | 6 |

Los desacuerdos se reparten en dos grupos claros:

- **Errores de la referencia por la fecha.** Tuits de 2018 a 2021 sobre Carmena, Colau, Garzón,
  Errejón o IU que la referencia llama Sumar y Jev llama otro partido, Podemos o ninguno. Aquí Jev
  suele tener mejor criterio que la referencia.
- **Jev sin conocimiento del mundo**, como ya estaba documentado. Ortega Smith diciendo «no somos
  franquistas» sale neutro; una invitación de Juanma Moreno a un programa sale no política; una
  frase de Abascal sobre el «Frente Popular» sale contra varios partidos.

Los desacuerdos se concentran en confianza baja: la mediana general de la confianza en la elección
de partido y dirección es 0,77, y 24 de los 35 desacuerdos están por debajo de 0,5.

## Qué sale de aquí

1. Jev con esta rúbrica resuelve bien lo estructural cuando tiene los hechos delante. Lo que le
   falta en tuits reales es contexto, que es justo lo que miden las variantes con ficha (J01 y J11).
2. La pregunta de evidencia suficiente hay que rehacerla antes de cualquier comparación.
3. Los 35 desacuerdos en los 53 tuits reales necesitan revisión para saber quién acierta; sin eso, el acuerdo con la referencia no dice si Jev mejora o empeora.

Siguiente paso propuesto: fichas fechadas con Gemini 3.7 Flash y búsqueda para los 53 tuits reales
y repetir la sonda con ficha. Coste estimado de las fichas, a 0,0014 USD por tuit medido en el
skill: unos 0,08 USD. Necesita aprobación.
