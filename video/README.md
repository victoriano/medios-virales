# Vídeo explicativo (Hyperframes)

Vídeo de ~2 min que explica el proyecto escena a escena: pregunta, datos, método, ejemplo, índice,
mapa, hallazgos y cierre. Se hace con [Hyperframes](https://www.npmjs.com/package/hyperframes)
(HTML + GSAP renderizado a MP4). Movido aquí desde `victoriano/victorianoAI`
(rama `claude/project-thread-ptoshs`, `videos/medios-virales/`).

## Cómo se genera

1. Elige una voz y copia sus 8 clips a `audio/` (está en `.gitignore`):
   ```bash
   mkdir -p video/audio && cp video/voces/elevenlabs-mi-voz/vo*.wav video/audio/
   ```
2. Regenera escenas y tiempos (cada escena dura lo que su clip + 1 s):
   ```bash
   cd video && python3 gen.py . ../site/data/index.json
   ```
3. Renderiza (Node 22+ y ffmpeg; `npx hyperframes doctor` si falla):
   ```bash
   npx -y hyperframes@latest render --output medios-virales.mp4 --quality high
   ```

`gen.py` escribe `index.html` y `compositions/*.html`; los datos (cifras, medios del mapa,
hallazgos) salen de `site/data/index.json`, así que si cambian los datos basta con regenerar.

## Guiones (`guiones/`, una línea por escena, vo1 … vo8)

| Fichero | Uso |
| --- | --- |
| `v1-original.txt` | Primera versión, más de locución leída. |
| `natural-elevenlabs.txt` | Registro hablado, con etiquetas de tono de ElevenLabs v3 (`[conversational]`, `[curious]`, `[warm]`). |
| `natural.txt` | El mismo texto sin etiquetas, para modelos que no las usan (Higgs). |

Las cifras se escriben con letra para que el TTS las lea bien.

## Voces (`voces/`)

| Carpeta | Motor | Guion | Notas |
| --- | --- | --- | --- |
| `elevenlabs-mi-voz-v1/` | ElevenLabs `eleven_v3`, voz clonada de Victoriano | `v1-original` | estabilidad 0,5; algo artificial |
| `elevenlabs-mi-voz/` | ElevenLabs `eleven_v3`, voz clonada de Victoriano | `natural-elevenlabs` | estabilidad 0,35; la versión de referencia |
| `elevenlabs-catalogo-tomas-aguirre/` | ElevenLabs `eleven_v3`, voz de catálogo «Tomás Aguirre» | `natural-elevenlabs` | voz de stock, grave y pausada |
| `higgs-mi-voz/` | Higgs TTS 3 4B (Boson AI), MLX 6-bit en local | `natural` | clonado sin entrenamiento desde 23 s de referencia; 24 kHz |

### ElevenLabs (vía conector Magnific)

La voz «Victoriano Izquierdo» está en *My Voices* de Magnific, clonada con ~3 min de charlas suyas
en solitario (Universidad Europea 2021 y Granada Innova 2019). Para regenerar una línea:
`audio_tts` con esa voz (`source=mine`), `model=eleven_v3`, `stability=0.35`, y convertir el mp3 a
wav 44,1 kHz mono con ffmpeg.

### Higgs TTS 3 (local, gratis)

`voces/higgs.sh <ref.wav> <ref.txt> guiones/natural.txt <salida>` genera los 8 clips con mlx-audio
en un Mac con Apple Silicon. El audio de referencia no está en el repo (sale de un vídeo de YouTube):
15–30 s de voz limpia + su transcripción literal. En un M2 de 16 GB tarda ~3,5 min por línea y va
justo de memoria; si el disco interno está lleno, apunta `HF_HOME`, `UV_CACHE_DIR` y `TMPDIR` a un
disco externo. Licencia del modelo: investigación y uso no comercial; para contenido monetizado
Boson pide acreditar «Boson AI's Higgs Audio».

## Renders

Los MP4 no se versionan (~9 MB cada uno). Los últimos están en `~/Code/mediabias/video/` del Mac
y en la rama original de `victorianoAI`.
