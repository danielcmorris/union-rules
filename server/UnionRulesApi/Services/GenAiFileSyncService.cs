using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;

namespace UnionRulesApi.Services;

public record GenAiFileRef(string DisplayName, string MimeType, string FileUri);

/// <summary>
/// Lists files from the GCS bucket union-rules-docs and returns them as gs:// URIs
/// for direct use with the Vertex AI Gemini API's fileData parts.
/// No Gemini File API registration is needed — Vertex AI reads GCS natively.
/// </summary>
public class GenAiFileSyncService
{
    private const string Bucket = "union-rules-docs";

    private readonly StorageClient _storage;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IReadOnlyDictionary<string, GenAiFileRef>? _cached;

    public GenAiFileSyncService(IConfiguration config)
    {
        var credPath   = config["Gemini:ServiceAccountPath"];
        var credential = string.IsNullOrWhiteSpace(credPath)
            ? GoogleCredential.GetApplicationDefault()
            : GoogleCredential.FromFile(credPath);

        _storage = StorageClient.Create(
            credential.CreateScoped("https://www.googleapis.com/auth/cloud-platform"));
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /// <summary>Returns cached GCS file refs, populating on first call.</summary>
    public async Task<IReadOnlyDictionary<string, GenAiFileRef>> GetFileRefsAsync()
    {
        if (_cached is not null) return _cached;

        await _lock.WaitAsync();
        try
        {
            _cached ??= await ListGcsFilesAsync();
            return _cached;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>Re-reads the GCS bucket and refreshes the cache.</summary>
    public async Task<IReadOnlyDictionary<string, GenAiFileRef>> SyncAsync()
    {
        await _lock.WaitAsync();
        try
        {
            _cached = await ListGcsFilesAsync();
            return _cached;
        }
        finally
        {
            _lock.Release();
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private async Task<IReadOnlyDictionary<string, GenAiFileRef>> ListGcsFilesAsync()
    {
        var refs = new Dictionary<string, GenAiFileRef>();
        await foreach (var obj in _storage.ListObjectsAsync(Bucket))
        {
            var mimeType = GetMimeType(obj.Name, obj.ContentType);
            var gcsUri   = $"gs://{Bucket}/{obj.Name}";
            refs[obj.Name] = new GenAiFileRef(obj.Name, mimeType, gcsUri);
        }
        return refs;
    }

    private static string GetMimeType(string name, string? contentType) =>
        name.EndsWith(".pdf",  StringComparison.OrdinalIgnoreCase) ? "application/pdf"
        : name.EndsWith(".txt", StringComparison.OrdinalIgnoreCase) ? "text/plain"
        : name.EndsWith(".md",  StringComparison.OrdinalIgnoreCase) ? "text/plain"
        : contentType ?? "application/octet-stream";
}
