using Microsoft.AspNetCore.Mvc;
using UnionRulesApi.Models;
using UnionRulesApi.Services;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly GeminiService _geminiService;

    public ChatController(GeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost("explain")]
    public async Task<ActionResult<ExplainResponse>> Explain([FromBody] ExplainRequest request)
    {
        var answer = await _geminiService.ExplainAsync(request);
        return Ok(new ExplainResponse { Answer = answer });
    }
}
