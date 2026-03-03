using Microsoft.AspNetCore.Mvc;
using UnionRulesApi.Services;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly GenAiFileSyncService _fileSync;

    public SyncController(GenAiFileSyncService fileSync)
    {
        _fileSync = fileSync;
    }

    /// <summary>
    /// Called by the client immediately after login.
    /// Syncs the GCS bucket with the Gemini File API and warms the cache.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Sync()
    {
        var refs = await _fileSync.SyncAsync();
        return Ok(new { registered = refs.Count, files = refs.Keys });
    }
}
