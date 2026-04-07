using backend_Csharp.Models;

namespace backend_Csharp.Services;

public interface IJwtService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken(User user);
}
