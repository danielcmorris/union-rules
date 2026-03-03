namespace UnionRulesApi.Models;

public class VertexAiSearchRequest
{
    public string Question { get; set; } = string.Empty;

    /// <summary>
    /// Optional focused query used for Discovery Engine lookup.
    /// Falls back to Question when not provided.
    /// </summary>
    public string? SearchQuery { get; set; }

    public string? TimesheetContext { get; set; }
    public List<ConversationMessage>? ConversationHistory { get; set; }
}

public class VertexAiSearchResponse
{
    public string Answer { get; set; } = string.Empty;
}
