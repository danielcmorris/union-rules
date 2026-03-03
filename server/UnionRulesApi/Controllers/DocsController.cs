using Microsoft.AspNetCore.Mvc;
using UnionRulesApi.Models;
using UnionRulesApi.Services;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/docs")]
public class DocsController : ControllerBase
{
    private readonly DocsService _docs;
    private readonly VertexAiService _vertexAiService;
    private readonly GenAiFileSyncService _fileSync;

    public DocsController(DocsService docs, VertexAiService vertexAiService, GenAiFileSyncService fileSync)
    {
        _docs            = docs;
        _vertexAiService = vertexAiService;
        _fileSync        = fileSync;
    }

    [HttpGet]
    public async Task<ActionResult<List<DocFile>>> List()
    {
        var files = await _docs.ListFilesAsync();
        return Ok(files);
    }

    [HttpGet("content")]
    public async Task<ActionResult<string>> GetContent([FromQuery] string name)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        var content = await _docs.GetContentAsync(name);
        return Ok(content);
    }

    [HttpPut("content")]
    public async Task<IActionResult> SaveContent([FromQuery] string name, [FromBody] SaveContentRequest request)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        await _docs.SaveContentAsync(name, request.Content);
        _ = _fileSync.SyncAsync();
        return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> CreateFile([FromQuery] string name, [FromBody] SaveContentRequest request)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        await _docs.SaveContentAsync(name, request.Content);
        _ = _fileSync.SyncAsync();
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteFile([FromQuery] string name)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        await _docs.DeleteFileAsync(name);
        _ = _fileSync.SyncAsync();
        return NoContent();
    }

    [HttpPost("upload")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided.");
        var name = file.FileName;
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        if (!name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)) return BadRequest("Only PDF files are accepted.");
        using var stream = file.OpenReadStream();
        await _docs.UploadPdfAsync(name, stream);
        _ = _fileSync.SyncAsync();
        return NoContent();
    }

    [HttpGet("file")]
    public async Task<IActionResult> GetFile([FromQuery] string name)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        var (stream, contentType) = await _docs.GetFileStreamAsync(name);
        return File(stream, contentType, enableRangeProcessing: true);
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        await _vertexAiService.TriggerImportAsync();
        _ = _fileSync.SyncAsync();
        return Ok(new { message = "Sync started. The index will be updated within a few minutes." });
    }

    private static bool IsValidName(string? name) =>
        !string.IsNullOrWhiteSpace(name) &&
        !name.Contains("..") &&
        !name.Contains('/');
}
