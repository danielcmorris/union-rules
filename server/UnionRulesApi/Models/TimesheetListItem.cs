namespace UnionRulesApi.Models;

public class TimesheetListItem
{
    public int TimesheetId { get; set; }
    public DateTime TimesheetDate { get; set; }
    public string Foreman { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PayType { get; set; }
    public int PayTypeId { get; set; }
}
