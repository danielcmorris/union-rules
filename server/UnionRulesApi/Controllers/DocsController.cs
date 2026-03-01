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

    public DocsController(DocsService docs, VertexAiService vertexAiService)
    {
        _docs = docs;
        _vertexAiService = vertexAiService;
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
        return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> CreateFile([FromQuery] string name, [FromBody] SaveContentRequest request)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        await _docs.SaveContentAsync(name, request.Content);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteFile([FromQuery] string name)
    {
        if (!IsValidName(name)) return BadRequest("Invalid file name.");
        await _docs.DeleteFileAsync(name);
        return NoContent();
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        await _vertexAiService.TriggerImportAsync();
        return Ok(new { message = "Sync started. The index will be updated within a few minutes." });
    }

    private static bool IsValidName(string? name) =>
        !string.IsNullOrWhiteSpace(name) &&
        !name.Contains("..") &&
        !name.Contains('/');
}
