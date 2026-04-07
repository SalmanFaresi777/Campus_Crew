namespace backend_Csharp.Config;

public sealed class MongoSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "campuscrew";
}
