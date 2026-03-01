# Plan: PDF Upload/View/Delete in Docs Page

## Context
The docs page currently supports creating, editing, and deleting plain text files stored in Google Cloud Storage (`union-rules-docs` bucket). The user wants to extend this to also support PDF documents — upload, view inline, and delete.

Storage is already GCS; PDFs will be stored as `application/pdf` objects in the same bucket alongside text files.

---

## Approach
- **No new dependencies** — use a native browser `<embed>` for PDF viewing (works in all modern browsers)
- **API proxies PDF bytes** — avoids signed URL complexity; keeps auth consistent with existing endpoints
- **`contentType` field on `DocFile`** — drives which UI panel (editor vs viewer) is shown
- **Blob URL pattern** — Angular fetches PDF via `HttpClient` (sends auth headers), converts to an object URL, binds to embed `src`. This is required because `<embed src="...">` does not send auth headers. The object URL is revoked on cleanup.

---

## Changes Required

### 1. `server/UnionRulesApi/Models/DocsModels.cs`
- Add `public string ContentType { get; set; } = "text/plain";` to `DocFile`

### 2. `server/UnionRulesApi/Services/DocsService.cs`
- `ListFilesAsync()` — populate `ContentType` from each GCS object's `ContentType` metadata
- Add `UploadPdfAsync(string name, Stream pdfStream)` — uploads with `application/pdf` MIME type
- Add `GetFileStreamAsync(string name)` — returns `(Stream stream, string contentType)` for proxying
- `SaveContentAsync` stays unchanged (text only)

### 3. `server/UnionRulesApi/Controllers/DocsController.cs`
- Add `POST /api/docs/upload` — accepts `IFormFile`, validates `.pdf` extension, calls `UploadPdfAsync`
  - Decorate with `[RequestSizeLimit(104_857_600)]` (100 MB) to allow large PDFs
- Add `GET /api/docs/file` — streams raw bytes back with correct `Content-Type`
- `IsValidName()` needs no change — already permits `.pdf` filenames

### 4. `client/src/app/core/models/docs.model.ts`
- Add `contentType: string` to `DocFile` interface

### 5. `client/src/app/core/services/docs.service.ts`
- Add `uploadPdf(name: string, file: File): Observable<void>` — multipart POST to `/api/docs/upload`
- Add `getPdfBlob(name: string): Observable<string>` — fetches PDF bytes via `HttpClient` (preserving auth headers), returns `URL.createObjectURL(blob)` as a string. Caller must call `URL.revokeObjectURL()` on cleanup.

### 6. `client/src/app/features/docs/docs.component.ts`
- **File list** — show a PDF badge next to PDF files (distinguished by `contentType === 'application/pdf'`)
- **Upload button** — hidden `<input type="file" accept=".pdf">` triggered by an "Upload PDF" button in the panel header
- **Right panel** — when a PDF is selected, fetch blob URL via `getPdfBlob()`, show `<embed [src]="pdfUrl()" type="application/pdf">` instead of the textarea; revoke the object URL on deselect/destroy
- New signals: `uploading`, `pdfUrl` (holds the current blob URL string or null)
- On `ngOnDestroy`, revoke any live blob URL

---

## File Paths
| File | Change |
|------|--------|
| `server/UnionRulesApi/Models/DocsModels.cs` | Add `ContentType` field |
| `server/UnionRulesApi/Services/DocsService.cs` | Add upload/stream methods, populate content type in list |
| `server/UnionRulesApi/Controllers/DocsController.cs` | Add upload + file stream endpoints with 100 MB size limit |
| `client/src/app/core/models/docs.model.ts` | Add `contentType` |
| `client/src/app/core/services/docs.service.ts` | Add `uploadPdf`, `getPdfBlob` (blob URL pattern) |
| `client/src/app/features/docs/docs.component.ts` | PDF upload UI + inline viewer using blob URL |

---

## Verification
1. Run backend (`dotnet run` in `server/UnionRulesApi/`)
2. Run frontend (`ng serve` in `client/`)
3. Navigate to `/docs`
4. Upload a PDF via the new button — confirm it appears in the file list with a PDF badge
5. Click the PDF — confirm it renders inline in the right panel
6. Delete the PDF — confirm it disappears from the list
7. Confirm existing text file create/edit/delete still works
