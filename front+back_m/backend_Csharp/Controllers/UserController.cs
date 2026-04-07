using backend_Csharp.Data;
using backend_Csharp.Dtos;
using backend_Csharp.Models;
using backend_Csharp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Security.Cryptography;

namespace backend_Csharp.Controllers;

[ApiController]
[Route("api")]
public sealed class UserController(
    MongoDbContext db,
    IJwtService jwtService,
    IEmailService emailService,
    ICloudinaryService cloudinaryService,
    IUserContextService userContext,
    IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.Find(x => x.Email == req.Email).FirstOrDefaultAsync();
        if (user is null)
        {
            return Ok(new { success = false, errors = "Wrong email" });
        }

        if (!user.IsVerified)
        {
            return Unauthorized(new { success = false, errors = "Please verify your email before logging in." });
        }

        if (!user.IsApproved)
        {
            return Unauthorized(new { success = false, errors = "Your account is pending admin approval." });
        }

        var validPassword = BCrypt.Net.BCrypt.Verify(req.Password, user.Password);
        if (!validPassword)
        {
            return Ok(new { success = false, errors = "Wrong Password" });
        }

        if (user.IsAdmin && !user.IsApprovedAdmin)
        {
            return Ok(new { success = false, errors = "You are not approved as an admin yet." });
        }

        user.VerificationToken = string.Empty;

        var now = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(user.RefreshToken) || !user.RefreshTokenExpiry.HasValue || user.RefreshTokenExpiry <= now)
        {
            user.RefreshToken = jwtService.CreateRefreshToken(user);
            user.RefreshTokenExpiry = now.AddDays(1);
        }

        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == user.Id, user);

        var accessToken = jwtService.CreateAccessToken(user);

        return Ok(new
        {
            success = true,
            token = accessToken,
            refreshtoken = user.RefreshToken,
            user = new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                isAdmin = user.IsAdmin,
                isApproved = user.IsApproved,
                isVerified = user.IsVerified,
                isApprovedAdmin = user.IsApprovedAdmin
            }
        });
    }

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest req)
    {
        var emailExists = await db.Users.Find(x => x.Email == req.Email).AnyAsync();
        if (emailExists)
        {
            return BadRequest(new { success = false, errors = "Existing user found with same email" });
        }

        var usernameExists = await db.Users.Find(x => x.Username == req.Username).AnyAsync();
        if (usernameExists)
        {
            return BadRequest(new { success = false, errors = "Existing user found with same username" });
        }

        var tokenBytes = RandomNumberGenerator.GetBytes(20);
        var verificationToken = Convert.ToHexString(tokenBytes).ToLowerInvariant();

        var user = new User
        {
            Username = req.Username,
            Email = req.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Dob = req.Dob,
            Location = req.Location,
            IsAdmin = req.IsAdmin,
            IsApproved = false,
            IsApprovedAdmin = req.IsAdmin ? false : true,
            VerificationToken = verificationToken,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await db.Users.InsertOneAsync(user);

        var frontend = (config["FrontendUrl"] ?? config["FRONTEND_URL"] ?? "http://localhost:3000").TrimEnd('/');
        var verifyUrl = $"{frontend}/verify-email/{verificationToken}";

        var text = $"Hello {user.Username},\n\nWelcome to CampusCrew!\n\nPlease verify your email by opening:\n{verifyUrl}\n\nBest regards,\nCampusCrew Team";
        await emailService.SendAsync(user.Email, "CampusCrew - Email Verification", text);

        return Ok(new
        {
            success = true,
            token = jwtService.CreateAccessToken(user),
            message = "Signup successful! Please verify your email and wait for admin approval."
        });
    }

    [HttpGet("verify-email/{token}")]
    public async Task<IActionResult> VerifyEmail([FromRoute] string token)
    {
        var user = await db.Users.Find(x => x.VerificationToken == token).FirstOrDefaultAsync();
        if (user is null)
        {
            return BadRequest(new { success = false, message = "Invalid or expired verification token." });
        }

        if (user.IsVerified)
        {
            return BadRequest(new { success = false, message = "Email is already verified." });
        }

        user.IsVerified = true;
        user.VerificationToken = string.Empty;
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == user.Id, user);

        return Ok(new { success = true, message = "Email verified successfully! You can now log in." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await db.Users.Find(x => x.Email == req.Email).FirstOrDefaultAsync();
        if (user is null)
        {
            return BadRequest(new { success = false, message = "User with this email does not exist." });
        }

        user.ResetPasswordToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(20)).ToLowerInvariant();
        user.ResetPasswordExpires = DateTime.UtcNow.AddHours(1);
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == user.Id, user);

        var frontend = (config["FrontendUrl"] ?? config["FRONTEND_URL"] ?? "http://localhost:3000").TrimEnd('/');
        var resetUrl = $"{frontend}/reset-password/{user.ResetPasswordToken}";
        var text = $"Hello {user.Username},\n\nReset your password from:\n{resetUrl}\n\nThis link expires in 1 hour.";
        await emailService.SendAsync(user.Email, "CampusCrew - Password Reset Request", text);

        return Ok(new { success = true, message = "Password reset link sent! Please check your email." });
    }

    [HttpGet("verify-reset-token/{token}")]
    public async Task<IActionResult> VerifyResetToken([FromRoute] string token)
    {
        var user = await db.Users.Find(x => x.ResetPasswordToken == token && x.ResetPasswordExpires > DateTime.UtcNow).FirstOrDefaultAsync();
        return Ok(new { valid = user is not null });
    }

    [HttpPost("reset-password/{token}")]
    public async Task<IActionResult> ResetPassword([FromRoute] string token, [FromBody] ResetPasswordRequest req)
    {
        var user = await db.Users.Find(x => x.ResetPasswordToken == token && x.ResetPasswordExpires > DateTime.UtcNow).FirstOrDefaultAsync();
        if (user is null)
        {
            return BadRequest(new { success = false, message = "Password reset token is invalid or has expired." });
        }

        user.Password = BCrypt.Net.BCrypt.HashPassword(req.Password);
        user.ResetPasswordToken = string.Empty;
        user.ResetPasswordExpires = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == user.Id, user);

        return Ok(new { success = true, message = "Password has been reset successfully!" });
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var uid = userContext.UserId;
        if (string.IsNullOrWhiteSpace(uid))
        {
            return Unauthorized(new { success = false, message = "No token provided" });
        }

        var user = await db.Users.Find(x => x.Id == uid).FirstOrDefaultAsync();
        if (user is null)
        {
            return NotFound(new { success = false, message = "User not found" });
        }

        return Ok(new { success = true, user = SafeUser(user) });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var uid = userContext.UserId;
        if (string.IsNullOrWhiteSpace(uid))
        {
            return Unauthorized(new { success = false, message = "No token provided" });
        }

        var user = await db.Users.Find(x => x.Id == uid).FirstOrDefaultAsync();
        if (user is null)
        {
            return NotFound(new { success = false, message = "User not found" });
        }

        if (!string.IsNullOrWhiteSpace(req.Email) && !string.Equals(req.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await db.Users.Find(x => x.Email == req.Email && x.Id != uid).AnyAsync();
            if (exists)
            {
                return BadRequest(new { success = false, message = "Email already exists" });
            }
            user.Email = req.Email;
        }

        if (!string.IsNullOrWhiteSpace(req.Username)) user.Username = req.Username;
        if (req.Location is not null) user.Location = req.Location;
        if (req.Dob.HasValue) user.Dob = req.Dob;
        if (req.TargetScore.HasValue) user.TargetScore = req.TargetScore;
        user.UpdatedAt = DateTime.UtcNow;

        await db.Users.ReplaceOneAsync(x => x.Id == uid, user);
        return Ok(new { success = true, user = SafeUser(user) });
    }

    [Authorize]
    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var uid = userContext.UserId;
        var user = await db.Users.Find(x => x.Id == uid).FirstOrDefaultAsync();
        if (user is null)
        {
            return NotFound(new { success = false, message = "User not found" });
        }

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.Password))
        {
            return BadRequest(new { success = false, message = "Current password is incorrect" });
        }

        user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == uid, user);

        return Ok(new { success = true, message = "Password changed successfully" });
    }

    [Authorize]
    [HttpPut("upload-photo/{id}")]
    public async Task<IActionResult> UploadPhoto([FromRoute] string id, IFormFile? photo)
    {
        if (photo is null || photo.Length == 0)
        {
            return BadRequest(new { success = false, message = "No file uploaded" });
        }

        var uid = userContext.UserId;
        if (uid != id)
        {
            return StatusCode(403, new { success = false, message = "Forbidden" });
        }

        var user = await db.Users.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (user is null)
        {
            return NotFound(new { success = false, message = "User not found" });
        }

        var url = await cloudinaryService.UploadImageAsync(photo, "profile_photos");
        if (string.IsNullOrWhiteSpace(url))
        {
            return StatusCode(500, new { success = false, message = "Error uploading photo" });
        }

        user.ProfilePic = url;
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == id, user);

        return Ok(new { success = true, url });
    }

    [Authorize]
    [HttpGet("pending-requests")]
    public async Task<IActionResult> PendingRequests()
    {
        var current = await GetCurrentUserAsync();
        if (current is null) return Unauthorized(new { success = false, message = "Unauthorized" });
        if (!current.IsAdmin || !current.IsApproved) return StatusCode(403, new { success = false, message = "Admin access required" });

        var users = await db.Users.Find(x => !x.IsApproved).SortByDescending(x => x.CreatedAt).ToListAsync();
        var requests = users.Select(u => new
        {
            _id = u.Id,
            username = u.Username,
            email = u.Email,
            isAdmin = u.IsAdmin,
            isVerified = u.IsVerified,
            location = u.Location,
            createdAt = u.CreatedAt
        });

        return Ok(new { success = true, requests });
    }

    [Authorize]
    [HttpPatch("pending-requests/{id}/approve")]
    public async Task<IActionResult> ApproveRequest([FromRoute] string id)
    {
        var current = await GetCurrentUserAsync();
        if (current is null) return Unauthorized(new { success = false, message = "Unauthorized" });
        if (!current.IsAdmin || !current.IsApproved) return StatusCode(403, new { success = false, message = "Admin access required" });

        var user = await db.Users.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (user is null) return NotFound(new { success = false, message = "Request not found" });

        user.IsApproved = true;
        if (user.IsAdmin) user.IsApprovedAdmin = true;
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == id, user);

        return Ok(new { success = true, message = "Request approved successfully" });
    }

    [Authorize]
    [HttpPatch("pending-requests/{id}/approve-email")]
    public async Task<IActionResult> ApproveEmail([FromRoute] string id)
    {
        var current = await GetCurrentUserAsync();
        if (current is null) return Unauthorized(new { success = false, message = "Unauthorized" });
        if (!current.IsAdmin || !current.IsApproved) return StatusCode(403, new { success = false, message = "Admin access required" });

        var user = await db.Users.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (user is null) return NotFound(new { success = false, message = "Request not found" });

        user.IsVerified = true;
        user.VerificationToken = string.Empty;
        user.UpdatedAt = DateTime.UtcNow;
        await db.Users.ReplaceOneAsync(x => x.Id == id, user);

        return Ok(new { success = true, message = "Email approved successfully" });
    }

    [Authorize]
    [HttpDelete("pending-requests/{id}/reject")]
    public async Task<IActionResult> RejectRequest([FromRoute] string id)
    {
        var current = await GetCurrentUserAsync();
        if (current is null) return Unauthorized(new { success = false, message = "Unauthorized" });
        if (!current.IsAdmin || !current.IsApproved) return StatusCode(403, new { success = false, message = "Admin access required" });

        var user = await db.Users.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (user is null) return NotFound(new { success = false, message = "Request not found" });
        if (user.IsApproved) return BadRequest(new { success = false, message = "Cannot reject an already approved account" });

        await db.Users.DeleteOneAsync(x => x.Id == id);
        return Ok(new { success = true, message = "Request rejected successfully" });
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var uid = userContext.UserId;
        if (string.IsNullOrWhiteSpace(uid)) return null;
        return await db.Users.Find(x => x.Id == uid).FirstOrDefaultAsync();
    }

    private static object SafeUser(User user) => new
    {
        _id = user.Id,
        username = user.Username,
        email = user.Email,
        profilePic = user.ProfilePic,
        dob = user.Dob,
        location = user.Location,
        targetScore = user.TargetScore,
        isAdmin = user.IsAdmin,
        isApproved = user.IsApproved,
        isVerified = user.IsVerified,
        isApprovedAdmin = user.IsApprovedAdmin,
        createdAt = user.CreatedAt,
        updatedAt = user.UpdatedAt
    };
}
