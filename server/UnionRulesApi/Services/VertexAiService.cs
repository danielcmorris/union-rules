using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using UnionRulesApi.Models;

namespace UnionRulesApi.Services;

public class VertexAiService
{
    private const string SearchEndpoint =
        "https://discoveryengine.googleapis.com/v1alpha/projects/682935653385/locations/global" +
        "/collections/default_collection/engines/union-rules-search" +
        "/servingConfigs/default_search:search";

    private const string ImportEndpoint =
        "https://discoveryengine.googleapis.com/v1/projects/682935653385/locations/global" +
        "/collections/default_collection/dataStores/{0}/branches/0/documents:import";

    private readonly HttpClient _httpClient;
    private readonly GoogleCredential _credential;
    private readonly IConfiguration _configuration;

    public VertexAiService(IConfiguration configuration)
    {
        _configuration = configuration;

        var credPath = configuration["VertexAi:ServiceAccountPath"]
            ?? throw new InvalidOperationException("VertexAi:ServiceAccountPath is not configured.");

        _credential = GoogleCredential.FromFile(credPath)
            .CreateScoped("https://www.googleapis.com/auth/cloud-platform");

        _httpClient = new HttpClient();
    }

    public async Task TriggerImportAsync()
    {
        var dataStoreId = _configuration["VertexAi:DataStoreId"]
            ?? throw new InvalidOperationException("VertexAi:DataStoreId is not configured.");

        var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync();
        var url   = string.Format(ImportEndpoint, dataStoreId);

        var body = JsonSerializer.Serialize(new {
            gcsSource = new {
                inputUris  = new[] { "gs://union-rules-docs/*" },
                dataSchema = "content"
            },
            reconciliationMode = "FULL"
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Discovery Engine import returned {(int)response.StatusCode}: {responseBody}");
    }

    /// <summary>
    /// Searches the knowledge base and returns relevant rule excerpts for the given question.
    /// </summary>
    public async Task<string> GetRuleExcerptsAsync(string question)
    {
        var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync();

        var body = new
        {
            query = question,
            pageSize = 10,
            queryExpansionSpec = new { condition = "AUTO" },
            spellCorrectionSpec = new { mode = "AUTO" },
            languageCode = "en-US",
            contentSearchSpec = new
            {
                extractiveContentSpec = new { maxExtractiveAnswerCount = 2 }
            }
        };

        var json = JsonSerializer.Serialize(body);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, SearchEndpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Discovery Engine returned {(int)response.StatusCode}: {responseBody}");

        return ExtractRuleText(responseBody);
    }

    // Legacy entry point kept for backwards compatibility
    public async Task<string> SearchAsync(VertexAiSearchRequest request)
    {
        var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync();

        var body = new
        {
            query = request.Question,
            pageSize = 10,
            queryExpansionSpec = new { condition = "AUTO" },
            spellCorrectionSpec = new { mode = "AUTO" },
            languageCode = "en-US",
            contentSearchSpec = new
            {
                extractiveContentSpec = new { maxExtractiveAnswerCount = 1 },
                summarySpec = new
                {
                    summaryResultCount = 5,
                    includeCitations = false
                }
            },
            userInfo = new { timeZone = "America/Los_Angeles" }
        };

        var json = JsonSerializer.Serialize(body);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, SearchEndpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Discovery Engine returned {(int)response.StatusCode}: {responseBody}");

        return ParseResponse(responseBody);
    }

    private static string ExtractRuleText(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var sb = new StringBuilder();

        if (root.TryGetProperty("results", out var results))
        {
            foreach (var result in results.EnumerateArray())
            {
                if (!result.TryGetProperty("document", out var document)) continue;
                if (!document.TryGetProperty("derivedStructData", out var derived)) continue;

                var title = derived.TryGetProperty("title", out var t) ? t.GetString() : null;
                if (!derived.TryGetProperty("extractive_answers", out var answers)) continue;

                foreach (var answer in answers.EnumerateArray())
                {
                    if (answer.TryGetProperty("content", out var content))
                    {
                        var txt = content.GetString();
                        if (!string.IsNullOrWhiteSpace(txt))
                        {
                            if (title != null) sb.AppendLine($"[{title}]");
                            sb.AppendLine(txt.Trim()).AppendLine();
                        }
                    }
                }
            }
        }

        return sb.Length > 0
            ? sb.ToString().Trim()
            : string.Empty;
    }

    private static string ParseResponse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.TryGetProperty("summary", out var summary) &&
            summary.TryGetProperty("summaryText", out var summaryText))
        {
            var text = summaryText.GetString();
            if (!string.IsNullOrWhiteSpace(text))
                return text;
        }

        var excerpts = ExtractRuleText(json);
        return excerpts.Length > 0
            ? excerpts
            : "No relevant information was found in the knowledge base for that query.";
    }
}
