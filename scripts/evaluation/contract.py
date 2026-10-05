"""Contrato semántico de la clasificación candidata.

Separa los campos que el clasificador publicado mezcla: presencia de política, entidades,
partido objetivo, dirección del mensaje, voz, encuadre del medio y evidencia. Las funciones
devuelven listas de errores legibles; una lista vacía significa que el registro cumple.

Nada aquí llama a un modelo. Jev entrega etiquetas y distribuciones, no justificaciones; la
evidencia la aporta el propio texto o la ficha factual, nunca se inventa.
"""
from __future__ import annotations

import re
from datetime import date

PARTIDOS = ("PP", "PSOE", "Vox", "Sumar", "Podemos", "otro")
PARTIDO_OBJETIVO = (*PARTIDOS, "varios", "ninguno", "indeterminado")
DIRECCION = ("beneficia", "perjudica", "neutro", "mixto", "indeterminado", "no_aplica")
VOZ = ("redaccion", "entrevistado", "cargo_politico", "periodista_opinion", "otra_fuente",
       "no_identificable")
ENCUADRE = ("apoyo_explicito", "critica_explicita", "atribucion_descriptiva", "mixto",
            "no_determinable")
CAMPOS_SALIDA = ("politica", "entidades", "partido_objetivo", "direccion_mensaje", "voz",
                 "encuadre_medio", "evidencia", "evidencia_suficiente")

# Lo único que el juez puede ver por defecto. El medio, la URL y la viralidad se guardan
# aparte para estratificar y agregar; enviarlos exige marcarlo de forma explícita.
CAMPOS_ENTRADA = {"id", "fecha", "texto", "texto_chars_original", "aviso_truncado", "contexto",
                  "rol_autor"}
# Claves de contexto que serían la respuesta disfrazada de contexto.
CLAVES_PROHIBIDAS_CONTEXTO = {"etiqueta", "etiqueta_previa", "partido_objetivo", "direccion",
                              "direccion_mensaje", "orientacion_medio", "sesgo_medio",
                              "beneficiario", "favorece_a"}

# Etiquetas literales de la referencia publicada, que pasaron por str.capitalize().
REFERENCIA_A_CANON = {"psoe": "PSOE", "pp": "PP", "vox": "Vox", "sumar": "Sumar",
                      "podemos": "Podemos", "varios": "varios", "ninguno": "ninguno"}

_ISO = re.compile(r"\d{4}-\d{2}-\d{2}")


def parse_fecha(value) -> date | None:
    if not isinstance(value, str) or not _ISO.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def normaliza(texto: str) -> str:
    return " ".join((texto or "").split()).casefold()


def partido_referencia(valor: str, politica: bool) -> str:
    """Traduce el partido literal de la referencia sin agrupar Podemos en Sumar."""
    if not politica:
        return "ninguno"
    raw = (valor or "").strip().lower()
    if not raw:
        return "indeterminado"
    return REFERENCIA_A_CANON.get(raw, "otro")


def valida_contexto(contexto, fecha_tuit: date) -> list[str]:
    errores = []
    if not isinstance(contexto, list):
        return ["contexto debe ser una lista de hechos"]
    ids = set()
    for i, hecho in enumerate(contexto):
        donde = f"contexto[{i}]"
        if not isinstance(hecho, dict):
            errores.append(f"{donde} no es un objeto")
            continue
        prohibidas = CLAVES_PROHIBIDAS_CONTEXTO & set(hecho)
        if prohibidas:
            errores.append(f"{donde} trae la respuesta como contexto: {sorted(prohibidas)}")
        if not hecho.get("id") or hecho["id"] in ids:
            errores.append(f"{donde} sin id o con id repetido")
        ids.add(hecho.get("id"))
        if not hecho.get("afirmacion"):
            errores.append(f"{donde} sin afirmacion")
        fecha_hecho = parse_fecha(hecho.get("fecha_hecho"))
        fecha_fuente = parse_fecha(hecho.get("fecha_fuente"))
        if fecha_hecho is None:
            errores.append(f"{donde} sin fecha_hecho ISO")
        elif fecha_hecho > fecha_tuit:
            errores.append(f"{donde} es posterior al tuit ({hecho['fecha_hecho']})")
        if fecha_fuente is None:
            errores.append(f"{donde} sin fecha_fuente ISO")
        elif fecha_fuente > fecha_tuit and not hecho.get("documenta_hecho_vigente"):
            errores.append(f"{donde} usa una fuente posterior sin marcar que documenta un hecho ya vigente")
        if not hecho.get("fuente"):
            errores.append(f"{donde} sin fuente")
    return errores


def valida_entrada(registro: dict) -> list[str]:
    """Lo que se envía al juez: fecha, texto íntegro y, si acaso, ficha factual fechada."""
    errores = []
    extra = set(registro) - CAMPOS_ENTRADA
    if extra:
        errores.append(f"campos no permitidos en la entrada del juez: {sorted(extra)}")
    fecha = parse_fecha(registro.get("fecha"))
    if fecha is None:
        errores.append("fecha ausente o no ISO")
    texto = registro.get("texto")
    if not isinstance(texto, str) or not texto.strip():
        errores.append("texto ausente")
    else:
        original = registro.get("texto_chars_original")
        if original is not None and original > len(texto) and not registro.get("aviso_truncado"):
            errores.append(f"texto truncado sin aviso ({len(texto)} de {original} caracteres)")
    if "contexto" in registro and fecha is not None:
        errores.extend(valida_contexto(registro["contexto"], fecha))
    return errores


def valida_salida(salida: dict, entrada: dict) -> list[str]:
    errores = []
    faltan = [c for c in CAMPOS_SALIDA if c not in salida]
    if faltan:
        return [f"faltan campos: {faltan}"]
    if not isinstance(salida["politica"], bool):
        errores.append("politica debe ser booleano")
    for campo, valores in (("partido_objetivo", PARTIDO_OBJETIVO), ("direccion_mensaje", DIRECCION),
                           ("voz", VOZ), ("encuadre_medio", ENCUADRE)):
        if salida[campo] not in valores:
            errores.append(f"{campo} fuera del vocabulario: {salida[campo]!r}")
    if errores:
        return errores
    errores.extend(valida_par(salida["politica"], salida["partido_objetivo"],
                              salida["direccion_mensaje"], salida["evidencia_suficiente"]))
    errores.extend(valida_evidencia(salida["evidencia"], salida["direccion_mensaje"], entrada))
    errores.extend(valida_entidades(salida["entidades"], entrada))
    return errores


def valida_par(politica: bool, partido: str, direccion: str, suficiente: bool) -> list[str]:
    """El partido y la dirección son una decisión conjunta, no dos respuestas sueltas."""
    if not politica:
        if (partido, direccion) != ("ninguno", "no_aplica"):
            return ["un tuit no político va con partido ninguno y dirección no_aplica, no con neutro"]
        return []
    if direccion == "no_aplica":
        return ["no_aplica solo vale para lo no político"]
    if not suficiente and direccion != "indeterminado":
        return ["sin evidencia suficiente la dirección es indeterminado, no neutro ni una señal"]
    if direccion == "indeterminado" and suficiente:
        return ["indeterminado exige evidencia_suficiente falso"]
    if partido == "indeterminado" and direccion != "indeterminado":
        return ["con partido indeterminado la dirección también lo es"]
    if direccion in ("beneficia", "perjudica", "mixto") and partido in ("ninguno", "indeterminado"):
        return [f"{direccion} necesita un partido objetivo, no {partido}"]
    return []


def valida_evidencia(evidencia, direccion: str, entrada: dict) -> list[str]:
    if not isinstance(evidencia, list):
        return ["evidencia debe ser una lista"]
    errores = []
    if direccion in ("beneficia", "perjudica", "mixto") and not evidencia:
        errores.append(f"{direccion} sin evidencia")
    texto = normaliza(entrada.get("texto", ""))
    contexto_ids = {h.get("id") for h in entrada.get("contexto", []) if isinstance(h, dict)}
    for i, item in enumerate(evidencia):
        tipo = item.get("tipo") if isinstance(item, dict) else None
        if tipo == "texto":
            fragmento = normaliza(item.get("fragmento", ""))
            if not fragmento or fragmento not in texto:
                errores.append(f"evidencia[{i}] cita un fragmento que no está en el tuit")
        elif tipo == "contexto":
            if item.get("id") not in contexto_ids:
                errores.append(f"evidencia[{i}] cita un hecho de contexto que no existe")
        else:
            errores.append(f"evidencia[{i}] con tipo desconocido")
    return errores


def valida_entidades(entidades, entrada: dict) -> list[str]:
    if not isinstance(entidades, list):
        return ["entidades debe ser una lista"]
    errores = []
    fecha = parse_fecha(entrada.get("fecha"))
    for i, entidad in enumerate(entidades):
        if not isinstance(entidad, dict) or not entidad.get("nombre"):
            errores.append(f"entidades[{i}] sin nombre")
            continue
        desde = parse_fecha(entidad.get("vigencia_desde")) if entidad.get("vigencia_desde") else None
        hasta = parse_fecha(entidad.get("vigencia_hasta")) if entidad.get("vigencia_hasta") else None
        if fecha and entidad.get("partido") and desde and desde > fecha:
            errores.append(f"entidades[{i}] usa una afiliación que empieza después del tuit")
        if fecha and entidad.get("partido") and hasta and hasta < fecha:
            errores.append(f"entidades[{i}] usa una afiliación que ya había terminado")
    return errores
