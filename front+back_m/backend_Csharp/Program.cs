using backend_Csharp.Config;
using backend_Csharp.Data;
using backend_Csharp.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection("Mongo"));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.Configure<ChatSettings>(builder.Configuration.GetSection("Chat"));

builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddSingleton<ICertificateService, CertificateService>();
builder.Services.AddSingleton<IConversationMemoryService, ConversationMemoryService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IUserContextService, UserContextService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.AccessSecret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Headers.TryGetValue("accesstoken", out var token) && !string.IsNullOrWhiteSpace(token))
                {
                    context.Token = token.ToString();
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
[
    "https://campuscrew.app",
    "https://www.campuscrew.app",
    "https://campuscrew.vercel.app",
    "https://campus-crew.vercel.app",
    "https://talk-threads-seven.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000"
];

builder.Services.AddCors(options =>
{
    options.AddPolicy("CampusCrewCors", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = exceptionFeature?.Error;

        context.Response.ContentType = "application/json";

        if (ex is MongoConnectionException || ex is TimeoutException)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Database connection failed. Please ensure MongoDB is running and try again."
            });
            return;
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "Internal server error"
        });
    });
});

app.UseCors("CampusCrewCors");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", (IConfiguration cfg) =>
{
    var port = cfg["PORT"] ?? cfg["ASPNETCORE_URLS"] ?? "8000";
    return Results.Ok($"Backend is running in port {port}");
});

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    message = "CORS is working!",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

app.Run();
