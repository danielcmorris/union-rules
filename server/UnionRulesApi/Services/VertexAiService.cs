using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;

namespace UnionRulesApi.Services;

public class VertexAiService
{
    private const string ImportEndpoint =
        "https://discoveryengine.googleapis.com/v1/projects/682935653385/locations/global" +
        "/collections/default_collection/dataStores/{0}/branches/0/documents:import";

    private readonly HttpClient _httpClient;
    private readonly GoogleCredential _credential;
    private readonly IConfiguration _configuration;

    public VertexAiService(IConfiguration configuration)
    {
        _configuration = configuration;

        var credPath = configuration["VertexAi:ServiceAccountPath"];
        var credential = string.IsNullOrWhiteSpace(credPath)
            ? GoogleCredential.GetApplicationDefault()
            : GoogleCredential.FromFile(credPath);

        _credential = credential.CreateScoped("https://www.googleapis.com/auth/cloud-platform");

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
}
