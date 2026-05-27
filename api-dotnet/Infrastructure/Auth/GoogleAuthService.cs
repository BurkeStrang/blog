using System.Net.Http.Headers;
using System.Text.Json;
using BlogApi.Configuration;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace BlogApi.Auth;

public sealed class GoogleAuthService
{
    private const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";
    private const string Scopes = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

    private readonly GoogleOAuthOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;

    public GoogleAuthService(IOptions<GoogleOAuthOptions> options, IHttpClientFactory httpClientFactory)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_options.ClientId) && !string.IsNullOrEmpty(_options.ClientSecret);

    public string BuildAuthCodeUrl(string state)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.RedirectUrl,
            ["response_type"] = "code",
            ["scope"] = Scopes,
            ["state"] = state,
            ["access_type"] = "offline",
        };
        return QueryHelpers.AddQueryString(AuthEndpoint, query);
    }

    public async Task<GoogleUserInfo?> ExchangeAndFetchAsync(string code, CancellationToken cancellationToken)
    {
        using var http = _httpClientFactory.CreateClient();

        var tokenForm = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = _options.RedirectUrl,
            ["grant_type"] = "authorization_code",
        });

        using var tokenResponse = await http.PostAsync(TokenEndpoint, tokenForm, cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            return null;
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        if (!tokenDoc.RootElement.TryGetProperty("access_token", out var accessTokenProp))
        {
            return null;
        }
        var accessToken = accessTokenProp.GetString();
        if (string.IsNullOrEmpty(accessToken))
        {
            return null;
        }

        using var userRequest = new HttpRequestMessage(HttpMethod.Get, UserInfoEndpoint);
        userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var userResponse = await http.SendAsync(userRequest, cancellationToken);
        if (!userResponse.IsSuccessStatusCode)
        {
            return null;
        }

        var userJson = await userResponse.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<GoogleUserInfo>(userJson);
    }
}
