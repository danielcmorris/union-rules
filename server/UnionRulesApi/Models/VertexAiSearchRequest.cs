namespace UnionRulesApi.Models;

public class VertexAiSearchRequest
{
    public string Question { get; set; } = string.Empty;
    public string? TimesheetContext { get; set; }
    public List<ConversationMessage>? ConversationHistory { get; set; }
}

public class VertexAiSearchResponse
{
    public string Answer { get; set; } = string.Empty;
}
