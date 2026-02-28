using Microsoft.AspNetCore.Mvc;
using UnionRulesApi.Models;
using UnionRulesApi.Services;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/vertexai")]
public class VertexAiController : ControllerBase
{
    private readonly VertexAiService _vertexAiService;
    private readonly GeminiService _geminiService;

    public VertexAiController(VertexAiService vertexAiService, GeminiService geminiService)
    {
        _vertexAiService = vertexAiService;
        _geminiService   = geminiService;
    }

    [HttpPost("search")]
    public async Task<ActionResult<VertexAiSearchResponse>> Search([FromBody] VertexAiSearchRequest request)
    {
        // Step 1: retrieve relevant rule excerpts from the knowledge base
        var ruleExcerpts = await _vertexAiService.GetRuleExcerptsAsync(request.Question);

        // Step 2: ask Gemini to answer the question using those rules + the timesheet
        var answer = await _geminiService.AnswerWithRulesAsync(
            request.Question,
            ruleExcerpts,
            request.TimesheetContext);

        return Ok(new VertexAiSearchResponse { Answer = answer });
    }
}
