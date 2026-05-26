using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace BlogApi.Auth;

public sealed class OAuthStateStore
{
    private static readonly TimeSpan StateLifetime = TimeSpan.FromMinutes(10);

    private readonly ConcurrentDictionary<string, DateTime> _states = new();

    public string Issue()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var state = Base64UrlEncode(bytes);
        _states[state] = DateTime.UtcNow.Add(StateLifetime);
        return state;
    }

    public bool ConsumeAndValidate(string? state)
    {
        if (string.IsNullOrEmpty(state) || !_states.TryRemove(state, out var expiry))
        {
            return false;
        }
        return DateTime.UtcNow <= expiry;
    }

    public void PruneExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var (state, expiry) in _states)
        {
            if (now > expiry)
            {
                _states.TryRemove(state, out _);
            }
        }
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
