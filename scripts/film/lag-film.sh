#!/usr/bin/env bash
# Lager bildesekvens (desktop + mobil), loop-videoer, plakater og manifest til skrollfilmen.
# Loopen er filmens første sekunder spilt forover og baklengs, så den starter på nøyaktig samme bilde.
# Bruk: scripts/film/lag-film.sh <kilde.mp4> [kvalitet] [loop-sekunder]
set -euo pipefail

SRC="$1"
Q="${2:-72}"
LOOP_SECONDS="${3:-3}"
FPS=12
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/film"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/lag-film.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

# Mobil: stående utsnitt (608:1080) midt i bildet
MOBIL_CROP="crop=trunc(ih*608/1080/2)*2:ih"

rm -rf "$OUT/desktop" "$OUT/mobil"
mkdir -p "$OUT/desktop" "$OUT/mobil" "$TMP/desktop" "$TMP/mobil"

ffmpeg -loglevel error -i "$SRC" -an -vf "fps=$FPS,scale=1280:720:flags=lanczos" "$TMP/desktop/f%04d.png"
ffmpeg -loglevel error -i "$SRC" -an -vf "fps=$FPS,$MOBIL_CROP,scale=608:1080:flags=lanczos" "$TMP/mobil/f%04d.png"

for set in desktop mobil; do
  for f in "$TMP/$set"/*.png; do
    cwebp -quiet -q "$Q" -m 6 "$f" -o "$OUT/$set/$(basename "${f%.png}").webp"
  done
done

cp "$OUT/desktop/f0001.webp" "$OUT/poster-desktop.webp"
cp "$OUT/mobil/f0001.webp" "$OUT/poster-mobil.webp"

PINGPONG="split[f][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1:a=0"
ffmpeg -loglevel error -y -t "$LOOP_SECONDS" -i "$SRC" -an -vf "scale=1280:720:flags=lanczos,$PINGPONG,format=yuv420p" \
  -c:v libx264 -crf 23 -preset slow -movflags +faststart "$OUT/loop-desktop.mp4"
ffmpeg -loglevel error -y -t "$LOOP_SECONDS" -i "$SRC" -an -vf "$MOBIL_CROP,scale=608:1080:flags=lanczos,$PINGPONG,format=yuv420p" \
  -c:v libx264 -crf 23 -preset slow -movflags +faststart "$OUT/loop-mobil.mp4"

DESKTOP_N=$(find "$OUT/desktop" -name '*.webp' | wc -l | tr -d ' ')
MOBIL_N=$(find "$OUT/mobil" -name '*.webp' | wc -l | tr -d ' ')
if [ "$DESKTOP_N" != "$MOBIL_N" ]; then
  echo "Ulikt antall bilder: desktop=$DESKTOP_N mobil=$MOBIL_N" >&2
  exit 1
fi

cat > "$OUT/manifest.json" <<JSON
{
  "fps": $FPS,
  "frameCount": $DESKTOP_N,
  "duration": 30,
  "sets": {
    "desktop": { "width": 1280, "height": 720 },
    "mobil": { "width": 608, "height": 1080 }
  }
}
JSON

echo "frames=$DESKTOP_N"
du -sh "$OUT/desktop" "$OUT/mobil" "$OUT"/loop-*.mp4
