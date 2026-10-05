# Validación de la siguiente clasificación: fases sin coste

Ejecución de las partes del plan `docs/plans/2026-09-27-validacion-clasificador.md` que no
necesitan llamar a ningún modelo. Hecho el 5 de octubre de 2026. **No se ha hecho ninguna llamada
de pago** ni se ha tocado producción ni el taller original.

## Qué hay aquí

| Fichero | Qué es |
| --- | --- |
| `baseline_manifest.json` | Referencia A congelada: hashes de las etiquetas publicadas, la capa contextual, los scripts y los JSON del sitio de producción y de desarrollo |
| `rubric.md` | Rúbrica revisada con los campos separados, pendiente de sellar |
| `context_schema.json` | Esquema de la ficha factual fechada |
| `holdout_manifest.json` | Diseño del examen reservado de 240: semilla, tamaños por cruce, pesos y hashes. Las IDs y etiquetas están fuera del repositorio |
| `development.jsonl` | 120 tuits reales de desarrollo, solo con `id`, `fecha` y `texto` |
| `regression_candidatos.jsonl` | 24 candidatos a control de regresión, **sin revisar** |
| `pairs.jsonl` | 24 pares mínimos sintéticos, 48 entradas, con expectativas declaradas |
| `sampling_manifest.json` | Cuotas, exclusiones y hallazgos de la selección |

El código está en `scripts/evaluation/` y las pruebas en `tests/test_evaluation_*.py`:

```bash
python3 -B -m unittest discover -s tests -p 'test_evaluation_*.py' -v
```

## Fuera del repositorio, en el taller

```
~/typesafe-lab/politica/medios/polarizacion/validacion_vnext/
  referencia_20261005/          copia congelada de todas las fuentes, con manifest.json
  muestras_20261005/
    examen/entradas.jsonl       entradas del examen reservado
    examen_referencia/          etiquetas, medio y pesos del examen; no se enseñan al juez
    desarrollo_referencia.jsonl etiquetas previas del desarrollo, solo para seleccionar
```

## Resultados de la congelación

- Producción y desarrollo están en el mismo commit, `6ec417e`, y sus 627 ficheros de datos tienen
  el mismo hash de árbol. Si el sitio cambia, se congela de nuevo en otra carpeta.
- Universo: 602.906 IDs únicas, ninguna repetida entre las dos series. 155.922 políticas.
- Los hashes de `clasificado.jsonl` y `clasificado_contextual.jsonl` coinciden con los que guardó
  la capa contextual al aplicarse. La procedencia está intacta.

## Hallazgo de la selección

La referencia etiqueta como **Sumar 1.953 tuits políticos de 2018 a 2021 y 685 de 2022**, antes de
que Sumar existiera como partido. Son tuits sobre Errejón, Carmena, Garzón u Oltra. Es el efecto
directo de no enviar la fecha: el modelo aplica la política de hoy a un tuit de 2019. El efecto en
los bloques del mapa es pequeño, porque el agregador ya agrupa Podemos en Sumar, pero cambia
cualquier lectura por partido.

## Lo que falta y por qué

1. **Las 8 correcciones de la auditoría antigua.** El fichero de la auditoría de 200 no está en el
   VPS y Victoriano no sabe si llegó a hacerse. La prueba 1 queda con los 24 controles candidatos
   y sin esos 8 errores conocidos.
2. **Revisar y sellar.** Los 24 controles son etiquetas de referencia, no verdad revisada. La
   frontera de las coaliciones ya está decidida (cuenta para Sumar o Podemos). Sigue abierta qué
   lectura alimenta el índice.
3. **Las tareas 4 a 6 del plan**: runner, evaluación ciega e impacto. Necesitan llamadas.

## Coste estimado de lo que necesita llamadas

Estimación a partir de tarifas y consumos medidos en `typesafe/SKILL.md`, no medida todavía:

| Paso | Llamadas | Coste estimado |
| --- | --- | --- |
| Sonda de 12 llamadas con Jev | 12 | menos de 0,01 USD |
| Cuatro variantes sobre las 80 entradas | 320 | menos de 0,05 USD |
| Fichas factuales fechadas con Gemini 3.7 Flash y búsqueda, para desarrollo, regresión y examen | unas 400 entradas | entre 0,5 y 1 USD |
| Estabilidad: 40 casos repetidos tres veces | 120 | menos de 0,01 USD |
| Examen: A frente a la ganadora | 240 | menos de 0,05 USD |
| Revisión ciega por un modelo potente de los desacuerdos | según desacuerdos | entre 1 y 5 USD |

Total orientativo: **entre 2 y 7 USD**. La regla del proyecto es medir antes de extrapolar: primero
la sonda de 12 y la cifra real por llamada.

## Sonda de 100 llamadas a Jev

Hecha el 5 de octubre con `scripts/evaluation/run.py` y evaluada con `scripts/evaluation/evaluate.py`:
100 llamadas sin errores, `jev-1.13.0`, **0,0081 USD medidos**. Resultados y conclusiones en
`reports/piloto_jev_20261005.md`.
