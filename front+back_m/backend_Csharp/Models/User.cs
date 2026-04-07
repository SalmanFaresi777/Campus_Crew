using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace backend_Csharp.Models;

[BsonIgnoreExtraElements]
public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [BsonElement("username")]
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("email")]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("password")]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [BsonElement("profilePic")]
    [JsonPropertyName("profilePic")]
    public string ProfilePic { get; set; } = string.Empty;

    [BsonElement("dob")]
    [JsonPropertyName("dob")]
    public DateTime? Dob { get; set; }

    [BsonElement("location")]
    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [BsonElement("targetScore")]
    [JsonPropertyName("targetScore")]
    public double? TargetScore { get; set; }

    [BsonElement("isAdmin")]
    [JsonPropertyName("isAdmin")]
    public bool IsAdmin { get; set; }

    [BsonElement("isApproved")]
    [JsonPropertyName("isApproved")]
    public bool IsApproved { get; set; } = true;

    [BsonElement("isApprovedAdmin")]
    [JsonPropertyName("isApprovedAdmin")]
    public bool IsApprovedAdmin { get; set; } = true;

    [BsonElement("isVerified")]
    [JsonPropertyName("isVerified")]
    public bool IsVerified { get; set; }

    [BsonElement("verificationToken")]
    [JsonPropertyName("verificationToken")]
    public string VerificationToken { get; set; } = string.Empty;

    [BsonElement("resetPasswordToken")]
    [JsonPropertyName("resetPasswordToken")]
    public string ResetPasswordToken { get; set; } = string.Empty;

    [BsonElement("resetPasswordExpires")]
    [JsonPropertyName("resetPasswordExpires")]
    public DateTime? ResetPasswordExpires { get; set; }

    [BsonElement("refreshToken")]
    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [BsonElement("refreshTokenExpiry")]
    [JsonPropertyName("refreshTokenExpiry")]
    public DateTime? RefreshTokenExpiry { get; set; }

    [BsonElement("createdAt")]
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
