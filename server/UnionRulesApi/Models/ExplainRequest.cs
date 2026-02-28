namespace UnionRulesApi.Models;

public class ExplainRequest
{
    public string Question { get; set; } = string.Empty;
    public string? Context { get; set; }
    public List<ConversationMessage>? ConversationHistory { get; set; }
}

public class ConversationMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
