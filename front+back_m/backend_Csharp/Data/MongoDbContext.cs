using backend_Csharp.Config;
using backend_Csharp.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;

namespace backend_Csharp.Data;

public sealed class MongoDbContext
{
    public IMongoCollection<User> Users { get; }
    public IMongoCollection<Event> Events { get; }
    public IMongoCollection<Registration> Registrations { get; }

    public MongoDbContext(IOptions<MongoSettings> options, ILogger<MongoDbContext> logger)
    {
        var cfg = options.Value;
        var settings = MongoClientSettings.FromConnectionString(cfg.ConnectionString);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
        var client = new MongoClient(settings);
        var db = client.GetDatabase(cfg.DatabaseName);

        Users = db.GetCollection<User>("users");
        Events = db.GetCollection<Event>("events");
        Registrations = db.GetCollection<Registration>("registrations");

        try
        {
            EnsureIndexes();
        }
        catch (Exception ex)
        {
            // Do not crash API startup if Mongo is temporarily unavailable.
            logger.LogWarning(ex, "MongoDB index initialization skipped due to connection error.");
        }
    }

    private void EnsureIndexes()
    {
        var uniqueEmail = new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(x => x.Email),
            new CreateIndexOptions { Unique = true, Name = "ux_user_email" }
        );

        var uniqueUsername = new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(x => x.Username),
            new CreateIndexOptions { Unique = true, Name = "ux_user_username" }
        );

        Users.Indexes.CreateMany([uniqueEmail, uniqueUsername]);

        var eventDateIdx = new CreateIndexModel<Event>(
            Builders<Event>.IndexKeys.Ascending(x => x.Date),
            new CreateIndexOptions { Name = "ix_event_date" }
        );
        Events.Indexes.CreateOne(eventDateIdx);

        var regUnique = new CreateIndexModel<Registration>(
            Builders<Registration>.IndexKeys.Ascending(x => x.UserId).Ascending(x => x.EventId),
            new CreateIndexOptions { Unique = true, Name = "ux_reg_user_event" }
        );
        Registrations.Indexes.CreateOne(regUnique);
    }
}
