#!/usr/bin/env bash
# Hjelper for MCP-arbeideren (docs/mcp-arbeider.md). Bruk:
#   scripts/mcp-ko.sh liste                      jobber som venter
#   scripts/mcp-ko.sh hent <id> <utfil>          last ned inputUrl/fixedImageUrl til fil (velger riktig etter stage)
#   scripts/mcp-ko.sh claim <id>
#   scripts/mcp-ko.sh bilde <id> <url>           lever fikset bilde
#   scripts/mcp-ko.sh film <id> <url>            lever ferdig film
#   scripts/mcp-ko.sh feil <id> "<melding>"
# Trenger BURSDAG_URL (standard https://andreashatlem.no/bursdag) og BURSDAG_ADMIN_KEY i miljøet.
set -euo pipefail
BASE="${BURSDAG_URL:-https://andreashatlem.no/bursdag}"
KEY="${BURSDAG_ADMIN_KEY:?sett BURSDAG_ADMIN_KEY}"
api() { curl -sS -H "x-admin-key: $KEY" "$@"; }
case "${1:-}" in
  liste) api "$BASE/api/admin/mcp/jobs" | python3 -c '
import json,sys; d=json.load(sys.stdin); print("modus:", d["mode"], "| i kø bak:", d["waiting"])
for j in d["jobs"]: print(j["id"], j["type"], "stage="+str(j["stage"]), "claimed" if j["claimedAt"] else "ledig", "|", j["label"], "| aspekt", (j.get("fix") or {}).get("aspectRatio"), "| sek", j["seconds"])' ;;
  hent) url=$(api "$BASE/api/admin/mcp/jobs" | python3 -c '
import json,sys; d=json.load(sys.stdin); j=[x for x in d["jobs"] if x["id"]==sys.argv[1]][0]
print(j["fixedImageUrl"] if j["stage"]=="video" and j.get("fixedImageUrl") else j["inputUrl"])
print("PROMPT:", j["prompt"], file=sys.stderr); print("FIX:", json.dumps(j.get("fix"), ensure_ascii=False), file=sys.stderr)' "$2")
        curl -sS -o "$3" "$url" && echo "lastet $url -> $3" ;;
  claim) api -H "Content-Type: application/json" -d '{"worker":"mac"}' "$BASE/api/admin/mcp/jobs/$2/claim" ;;
  bilde) api -H "Content-Type: application/json" -d "{\"imageUrl\":\"$3\"}" "$BASE/api/admin/mcp/jobs/$2/result" ;;
  film)  api -H "Content-Type: application/json" -d "{\"videoUrl\":\"$3\"}" "$BASE/api/admin/mcp/jobs/$2/result" ;;
  feil)  api -H "Content-Type: application/json" -d "{\"error\":\"$3\"}" "$BASE/api/admin/mcp/jobs/$2/result" ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
echo
