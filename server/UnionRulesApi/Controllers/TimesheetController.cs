using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using UnionRulesApi.Models;

namespace UnionRulesApi.Controllers;

[ApiController]
[Route("api/timesheet")]
[Authorize]
public class TimesheetController : ControllerBase
{
    private readonly string _connectionString;

    public TimesheetController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("SiteReview")
            ?? throw new InvalidOperationException("SiteReview connection string is not configured.");
    }

    [HttpGet]
    public async Task<ActionResult<List<TimesheetListItem>>> GetTimesheets(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string sid)
    {
        if (string.IsNullOrWhiteSpace(sid))
            return BadRequest("Session ID (sid) is required.");

        const string sql = @"
            DECLARE @UserID INT;
            SELECT @UserID = sec.InternalContactsId
            FROM dbo.fnSecurity_UserBySessionId(@SessionID) sec;

            IF @UserID > 0
            BEGIN
                SELECT TOP 200
                    TimeSheetID,
                    TimeSheetDate,
                    i.FirstName + ' ' + i.LastName AS Foreman,
                    i.Email,
                    t.Status,
                    t.PayType,
                    t.PayTypeID
                FROM TimeSheet t
                INNER JOIN dbo.InternalContacts i ON i.InternalContactsID = t.EmployeeID
                WHERE t.Status <> 'DELETED'
                  AND t.TimeSheetDate BETWEEN @StartDate AND @EndDate
            END";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@SessionID", sid);
        cmd.Parameters.AddWithValue("@StartDate", startDate);
        cmd.Parameters.AddWithValue("@EndDate", endDate);

        var results = new List<TimesheetListItem>();
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            results.Add(new TimesheetListItem
            {
                TimesheetId   = reader.GetInt32(0),
                TimesheetDate = reader.GetDateTime(1),
                Foreman       = reader.GetString(2),
                Email         = reader.GetString(3),
                Status        = reader.GetString(4),
                PayType       = reader.IsDBNull(5) ? null : reader.GetString(5),
                PayTypeId     = reader.IsDBNull(6) ? 0 : reader.GetInt32(6)
            });
        }

        return Ok(results);
    }
}
