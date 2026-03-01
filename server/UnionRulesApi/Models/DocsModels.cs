namespace UnionRulesApi.Models;

public class DocFile
{
    public string Name    { get; set; } = "";
    public long   Size    { get; set; }
    public string Updated { get; set; } = "";
}

public class SaveContentRequest
{
    public string Content { get; set; } = "";
}
