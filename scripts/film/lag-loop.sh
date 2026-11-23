#!/usr/bin/env bash
# Setter sammen ventesløyfer (som alle starter og slutter på filmens første bilde) til loop for desktop og mobil.
# Tette nøkkelbilder (-g 8) så loopen kan spoles presist med skrollingen ved overgangen til filmen.
# Bruk: scripts/film/lag-loop.sh <vent1.mp4> [vent2.mp4 ...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/film"
MOBIL_CROP="crop=trunc(ih*608/1080/2)*2:ih"

inputs=()
filter=""
for i in $(seq 0 $(($# - 1))); do
  inputs+=(-i "${@:$((i + 1)):1}")
  # Dropp siste bilde i hvert klipp: det er likt første bilde i neste, og ellers står bildet stille et øyeblikk
  filter+="[$i:v]fps=24,trim=end_frame=143,setpts=PTS-STARTPTS[v$i];"
done
for i in $(seq 0 $(($# - 1))); do filter+="[v$i]"; done
filter+="concat=n=$#:v=1:a=0[loop]"

ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter;[loop]scale=1280:720:flags=lanczos,format=yuv420p[out]" \
  -map "[out]" -an -c:v libx264 -crf 26 -preset slow -g 8 -keyint_min 8 -movflags +faststart "$OUT/loop-desktop.mp4"
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter;[loop]$MOBIL_CROP,scale=608:1080:flags=lanczos,format=yuv420p[out]" \
  -map "[out]" -an -c:v libx264 -crf 26 -preset slow -g 8 -keyint_min 8 -movflags +faststart "$OUT/loop-mobil.mp4"

# Antall ventesløyfer = antall punkter der loopen er tilbake på filmens første bilde
python3 - "$OUT/manifest.json" "$#" <<'PY'
import json, sys
path, segments = sys.argv[1], int(sys.argv[2])
data = json.load(open(path))
data["loopSegments"] = segments
open(path, "w").write(json.dumps(data, indent=2) + "\n")
PY

for f in "$OUT"/loop-*.mp4; do
  echo "$(basename "$f") $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s $(du -h "$f" | cut -f1)"
done
