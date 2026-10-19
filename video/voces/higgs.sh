#!/usr/bin/env bash
# Genera vo1..vo8 con Higgs TTS 3 (Boson AI) en local, vía mlx-audio (Mac con Apple Silicon).
# Uso: video/voces/higgs.sh <ref.wav> <ref.txt> <guion.txt> <carpeta_salida>
# - ref.wav: 15-30 s de voz limpia de una sola persona (24 kHz mono).
# - ref.txt: transcripción literal de ref.wav (mejora mucho el clonado).
# - guion.txt: una línea por escena, sin etiquetas [..] de ElevenLabs.
# Modelo: build MLX 6-bit de la comunidad (~3,7 GB). Si el disco interno va justo,
# exporta HF_HOME, UV_CACHE_DIR y TMPDIR a un disco externo antes de lanzarlo.
set -euo pipefail
REF_WAV=$1; REF_TXT=$2; GUION=$3; OUT=$4
MODEL=${HIGGS_MODEL:-whitelabel/mlx-q6-higgs-tts-3-4b}
mkdir -p "$OUT"
i=0
while IFS= read -r line; do
  i=$((i+1)); [ -z "$line" ] && continue
  uvx --python 3.12 --from "mlx-audio@latest" mlx_audio.tts.generate \
    --model "$MODEL" --text "$line" --ref_audio "$REF_WAV" --ref_text "$(cat "$REF_TXT")" \
    --lang_code es --output_path "$OUT/tmp" --file_prefix "vo$i" --audio_format wav
  ffmpeg -v error -y -i "$OUT/tmp/vo${i}_000.wav" -ar 44100 -ac 1 "$OUT/vo$i.wav"
done < "$GUION"
rm -rf "$OUT/tmp"
