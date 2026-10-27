# Guía para etiquetar a mano el tipo de crítica (v5)

Cada tuit es de un medio y ya trae el partido afectado (`partido`) y si le perjudica o le beneficia (`direccion`). `contexto` aclara a quién se refieren los nombres. Tu trabajo es decir qué tipo de crítica (o defensa) hace el tuit a ese partido, el tema y, solo en ideas y gestión, cómo se argumenta.

Las opciones exactas (claves) están en `taxonomia_t5.json`: pregunta `tipo` (9 claves), `tema` (52 claves, cada una con su raíz) y `argumento`.

## Tipo

- **ideas**: se discute el contenido de una medida, ley, propuesta o postura política (qué se hace o se quiere hacer).
- **gestion**: se reprocha cómo de bien se ha hecho algo: tarde, mal, sin medios, sin previsión, resultados malos de un servicio o una política ya en marcha.
- **corrupcion**: delito o aprovechamiento del cargo, y su recorrido judicial (imputaciones, registros, juicios).
- **democracia**: saltarse contrapesos: instituciones, Parlamento, jueces, prensa, cloacas, bulos, libertades.
- **pactos**: con quién se alía o de quién depende, tensiones con socios, votaciones perdidas.
- **personal**: se ataca a la persona: insultos, motes, mentiras o contradicciones, hipocresía y privilegios sin delito, vida privada, imagen.
- **interna**: peleas, crisis, dimisiones o acoso dentro de un partido.
- **electoral**: encuestas, resultados, campaña.
- **otro**: el tuit no critica ni defiende al partido por nada de lo anterior (por ejemplo, información neutra, o el partido aparece solo de pasada).

Reglas de desempate:
- Si hay delito o aprovechamiento del cargo, es corrupción aunque también se critique la gestión.
- Un insulto acompañado de un hecho concreto se clasifica por el hecho; es personal solo si el tuit se queda en la persona.
- Si el tuit defiende al partido, clasifica el asunto del que lo defiende.
- Una etiqueta infamante sobre la postura de alguien («defiende a los terroristas», «vende España», «traidor») sin discutir la postura: si el tuit nombra una política o postura concreta (Irán, Venezuela, la amnistía…), es ideas con argumento **descalificacion**; si no nombra ninguna, es personal/insultos.

## Argumento (solo ideas y gestión; si no, `no_aplica`)

Sé exigente: la etiqueta describe lo que el tuit **dice**, no lo que podría decir el artículo enlazado.

- **descalificacion**: afirma que está mal, que es un desastre o pone una etiqueta, sin dar una razón. Una acusación grave o un titular tajante no es un argumento. Ejemplo: «Pedro Sánchez defiende a los terroristas: antes Venezuela y Hamás, ahora Irán, y siempre ETA» es descalificación: enumera, no explica.
- **argumento**: da al menos una razón explícita o una consecuencia («porque…», «lo que provocará…», «esto encarece…») que conecta la medida con un daño, sin cifras ni hechos verificables.
- **hechos**: la crítica se apoya en una cifra, un dato, un documento, un estudio o un hecho concreto y comprobable (fechas, cantidades, lo que pasó en un sitio concreto). Un titular informativo que narra un hecho concreto que perjudica al partido (por ejemplo «cuatro horas de retraso en Rodalies tras la avería») cuenta como hechos.
- **alternativa**: además de criticar con razones o datos, propone otra medida concreta.

En las defensas usa la misma escala para cómo se defiende.

## Salida

Un JSON por línea con: `id`, `tipo`, `tema` (una clave de esa raíz), `argumento`, `seguro` (true si lo tienes claro, false si dos etiquetas son defendibles) y `nota` (breve, solo si `seguro` es false o si el caso enseña algo sobre la frontera).
