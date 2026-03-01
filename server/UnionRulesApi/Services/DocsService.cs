using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using UnionRulesApi.Models;

namespace UnionRulesApi.Services;

public class DocsService
{
    private const string Bucket = "union-rules-docs";
    private readonly StorageClient _storage;

    public DocsService(IConfiguration config)
    {
        var credPath = config["VertexAi:ServiceAccountPath"];
        var credential = string.IsNullOrWhiteSpace(credPath)
            ? GoogleCredential.GetApplicationDefault()
            : GoogleCredential.FromFile(credPath);

        _storage = StorageClient.Create(credential);
    }

    public async Task<List<DocFile>> ListFilesAsync()
    {
        var files = new List<DocFile>();
        await foreach (var obj in _storage.ListObjectsAsync(Bucket))
        {
            files.Add(new DocFile
            {
                Name        = obj.Name,
                Size        = (long)(obj.Size ?? 0),
                Updated     = obj.UpdatedDateTimeOffset?.ToString("o") ?? "",
                ContentType = obj.ContentType ?? "text/plain"
            });
        }
        return files;
    }

    public async Task<string> GetContentAsync(string name)
    {
        using var ms = new MemoryStream();
        await _storage.DownloadObjectAsync(Bucket, name, ms);
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    public async Task SaveContentAsync(string name, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        using var ms = new MemoryStream(bytes);
        await _storage.UploadObjectAsync(Bucket, name, "text/plain", ms);
    }

    public async Task UploadPdfAsync(string name, Stream pdfStream)
    {
        await _storage.UploadObjectAsync(Bucket, name, "application/pdf", pdfStream);
    }

    public async Task<(Stream stream, string contentType)> GetFileStreamAsync(string name)
    {
        var obj = await _storage.GetObjectAsync(Bucket, name);
        var ms  = new MemoryStream();
        await _storage.DownloadObjectAsync(Bucket, name, ms);
        ms.Position = 0;
        return (ms, obj.ContentType ?? "application/octet-stream");
    }

    public async Task DeleteFileAsync(string name)
    {
        await _storage.DeleteObjectAsync(Bucket, name);
    }
}
