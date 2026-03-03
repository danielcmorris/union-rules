using Microsoft.AspNetCore.Mvc;
using UnionRulesApi.Models;
using UnionRulesApi.Services;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/vertexai")]
public class VertexAiController : ControllerBase
{
    private readonly GeminiService _geminiService;

    public VertexAiController(GeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost("search")]
    public async Task<ActionResult<VertexAiSearchResponse>> Search([FromBody] VertexAiSearchRequest request)
    {
        var answer = await _geminiService.AnswerWithRulesAsync(
            request.Question,
            request.TimesheetContext,
            request.ConversationHistory);

        return Ok(new VertexAiSearchResponse { Answer = answer });
    }
}
