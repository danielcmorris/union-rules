# GenAI File Sync

## Overview

Docs from the `union-rules-docs` GCS bucket are passed directly to Vertex AI Gemini as `gs://` URIs. No Gemini File API upload is needed — Vertex AI reads GCS natively.

---

## Key Classes

### `GenAiFileSyncService` (Singleton)

Lists files from the GCS bucket and caches them as `GenAiFileRef` records:

```csharp
public record GenAiFileRef(string DisplayName, string MimeType, string FileUri);
```

- `FileUri` is a `gs://union-rules-docs/<filename>` URI
- Cache is lazy-loaded on first call to `GetFileRefsAsync()`
- `SyncAsync()` forces a re-read of the bucket and refreshes the cache

### `SyncController` — `POST /api/sync`

Called by the client after login to warm/refresh the cache:

```
POST /api/sync
→ { "registered": 4, "files": ["RULES.md", "SAMPLE.md", ...] }
```

### `GeminiService`

Retrieves file refs via `_fileSync.GetFileRefsAsync()` and injects them as `fileData` parts in every Gemini request:

```csharp
parts.Add(new { fileData = new { mimeType = f.MimeType, fileUri = f.FileUri } });
```

All rule docs appear before the user's text in the `parts` array.

---

## Request Structure (sent to Vertex AI)

```json
{
  "systemInstruction": { "parts": [{ "text": "..." }] },
  "contents": [
    {
      "role": "user",
      "parts": [
        { "fileData": { "mimeType": "text/plain", "fileUri": "gs://union-rules-docs/RULES.md" } },
        { "fileData": { "mimeType": "text/plain", "fileUri": "gs://union-rules-docs/SAMPLE.md" } },
        { "text": "QUESTION:\n..." }
      ]
    }
  ]
}
```

---

## File Type Support

| Extension | MIME Type |
|-----------|-----------|
| `.pdf` | `application/pdf` |
| `.txt` | `text/plain` |
| `.md` | `text/plain` |
| other | GCS `ContentType` or `application/octet-stream` |

---

## No Upload / No Expiry

Unlike the Gemini File API (48-hour expiry, requires upload), GCS URIs are permanent. The sync step only lists bucket contents — no file data is transferred to or from the API server.
