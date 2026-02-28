#!/usr/bin/env bash
# Uploads rules docs to GCS and re-indexes them in Vertex AI Search.
# Run this whenever any .md file in the repo root changes.

set -euo pipefail

BUCKET="gs://union-rules-docs"
PROJECT="morrisdev-203721"
DATASTORE="union-rules-gcs"
DOCS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Switching to morrisdev account..."
gcloud config set account dmorris@morrisdev.com

echo "==> Uploading docs to $BUCKET..."
for f in "$DOCS_DIR"/*.md; do
  base=$(basename "$f" .md)
  gcloud storage cp "$f" "$BUCKET/${base}.txt" \
    --project="$PROJECT" \
    --quiet
  echo "    Uploaded ${base}.txt"
done

echo "==> Triggering re-index..."
TOKEN=$(gcloud auth print-access-token --billing-project="$PROJECT")
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT" \
  "https://discoveryengine.googleapis.com/v1alpha/projects/682935653385/locations/global/collections/default_collection/dataStores/${DATASTORE}/branches/default_branch/documents:import" \
  -d '{
    "gcsSource": {
      "inputUris": ["'"$BUCKET"'/*.txt"],
      "dataSchema": "content"
    },
    "reconciliationMode": "FULL"
  }')

OP_NAME=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])" 2>/dev/null)
if [ -z "$OP_NAME" ]; then
  echo "ERROR: Failed to start import. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "==> Import started: $OP_NAME"
echo "==> Waiting for indexing to complete..."

for i in $(seq 1 24); do
  sleep 5
  STATUS=$(curl -s \
    -H "Authorization: Bearer $(gcloud auth print-access-token --billing-project="$PROJECT")" \
    -H "x-goog-user-project: $PROJECT" \
    "https://discoveryengine.googleapis.com/v1alpha/${OP_NAME}")

  DONE=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('done', False))" 2>/dev/null)

  if [ "$DONE" = "True" ]; then
    SUCCESS=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('successCount','0'))" 2>/dev/null)
    FAILURE=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('failureCount','0'))" 2>/dev/null)
    TOTAL=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('totalCount','0'))" 2>/dev/null)
    echo ""
    echo "==> Done. $SUCCESS/$TOTAL indexed successfully, $FAILURE failed."
    if [ "$FAILURE" != "0" ] && [ "$FAILURE" != "" ]; then
      echo "    Check GCS error logs for details."
      exit 1
    fi
    echo "==> Switching back to service account..."
    gcloud config set account snapdragon@snapdragonerp.iam.gserviceaccount.com
    exit 0
  fi

  printf "    Waiting... (%ds)\r" $((i * 5))
done

echo ""
echo "ERROR: Timed out waiting for import to complete. Check the operation manually:"
echo "  $OP_NAME"
exit 1
