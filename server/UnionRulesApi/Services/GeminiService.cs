using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using UnionRulesApi.Models;
using ChatExplainRequest = UnionRulesApi.Models.ExplainRequest;

namespace UnionRulesApi.Services;

public class GeminiService
{
    private const string Model = "gemini-2.0-flash";

    private readonly GenAiFileSyncService _fileSync;
    private readonly GoogleCredential _credential;
    private readonly HttpClient _httpClient;
    private readonly string _endpoint;

    public GeminiService(IConfiguration configuration, GenAiFileSyncService fileSync)
    {
        _fileSync = fileSync;

        var credPath   = configuration["Gemini:ServiceAccountPath"];
        var credential = string.IsNullOrWhiteSpace(credPath)
            ? GoogleCredential.GetApplicationDefault()
            : GoogleCredential.FromFile(credPath);

        _credential = credential.CreateScoped("https://www.googleapis.com/auth/cloud-platform");

        var projectId = configuration["Gemini:ProjectId"]
            ?? throw new InvalidOperationException("Gemini:ProjectId is not configured.");
        var location = configuration["Gemini:Location"] ?? "us-central1";

        _endpoint = $"https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}" +
                    $"/locations/{location}/publishers/google/models/{Model}:generateContent";

        _httpClient = new HttpClient();
    }

    // ── Public methods ───────────────────────────────────────────────────────

    public async Task<string> ExplainAsync(ChatExplainRequest request)
    {
        var fileRefs = await _fileSync.GetFileRefsAsync();
        var contents = BuildConversationHistory(request.ConversationHistory);

        var questionText = string.IsNullOrWhiteSpace(request.Context)
            ? request.Question
            : $"{request.Context}\n\n---\n\nQuestion: {request.Question}";

        contents.Add(BuildUserContent(fileRefs.Values, questionText));

        return await GenerateAsync(ExplainSystemPrompt, contents);
    }

    public async Task<string> AnswerWithRulesAsync(
        string question,
        string? timesheetContext,
        List<ConversationMessage>? conversationHistory = null)
    {
        var fileRefs = await _fileSync.GetFileRefsAsync();
        var contents = BuildConversationHistory(conversationHistory);

        var sb = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(timesheetContext))
        {
            sb.AppendLine("TIMESHEET DATA:");
            sb.AppendLine(timesheetContext);
            sb.AppendLine();
        }
        sb.AppendLine("QUESTION:");
        sb.AppendLine(question);

        contents.Add(BuildUserContent(fileRefs.Values, sb.ToString()));

        return await GenerateAsync(AnswerSystemPrompt, contents);
    }

    // ── REST call ────────────────────────────────────────────────────────────

    private async Task<string> GenerateAsync(string systemPrompt, List<object> contents)
    {
        var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync();

        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = systemPrompt } } },
            contents
        };

        var json = JsonSerializer.Serialize(requestBody);

        using var req = new HttpRequestMessage(HttpMethod.Post, _endpoint);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var resp = await _httpClient.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            throw new HttpRequestException($"Gemini API returned {(int)resp.StatusCode}: {body}");

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()
            ?.Trim() ?? "";
    }

    // ── Content builders ─────────────────────────────────────────────────────

    private static List<object> BuildConversationHistory(List<ConversationMessage>? history) =>
        (history ?? []).Select(m => (object)new
        {
            role  = m.Role == "assistant" ? "model" : "user",
            parts = new[] { new { text = m.Content } }
        }).ToList();

    private static object BuildUserContent(IEnumerable<GenAiFileRef> fileRefs, string text)
    {
        var parts = new List<object>();

        foreach (var f in fileRefs)
            parts.Add(new { fileData = new { mimeType = f.MimeType, fileUri = f.FileUri } });

        parts.Add(new { text });

        return new { role = "user", parts };
    }

    // ── System prompts ───────────────────────────────────────────────────────

    private const string ExplainSystemPrompt =
        "You are a union pay rules assistant for Pinnacle Powers employees covered by the IBEW Local 1245 agreement.\n\n" +
        "You have been provided with documents. Those documents are your ONLY source of truth. " +
        "Do not use your training knowledge, general IBEW knowledge, or anything outside the provided documents. " +
        "If the answer is not in the provided documents, say so.\n\n" +
        "When citing a source, refer to it by document name only (e.g., 'per the TimeSheet Hour Calculation Rules'). " +
        "Do NOT generate markdown hyperlinks or any link syntax — no brackets, no parentheses, no URLs.\n\n" +
        "Show explicit arithmetic for every claim.";

    private const string AnswerSystemPrompt =
        "You are a union payroll expert for Pinnacle Powers employees covered by the IBEW Local 1245 agreement.\n\n" +
        "You have been provided with documents. Those documents are your ONLY source of truth. " +
        "Do not use your training knowledge, general IBEW knowledge, or anything outside the provided documents. " +
        "If the answer is not in the provided documents, say so.\n\n" +
        "When citing a source, refer to it by document name only (e.g., 'per the TimeSheet Hour Calculation Rules'). " +
        "Do NOT generate markdown hyperlinks or any link syntax — no brackets, no parentheses, no URLs.\n\n" +
        "Show your work, reference the specific rule and document for each claim, and give a clear numeric answer where applicable. " +
        "If the Question is simply 'Validate' then respond with 'Validated' if all rules are met, or 'Invalid' + explanation.";
}
