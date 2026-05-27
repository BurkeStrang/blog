namespace BlogApi.Infrastructure.Configuration;

public sealed class CosmosOptions
{
    public string Endpoint { get; set; } = "";
    public string Key { get; set; } = "";
    public string DatabaseName { get; set; } = "blog";
}
