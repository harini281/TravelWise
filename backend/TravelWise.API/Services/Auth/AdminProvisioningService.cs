using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.Models;

namespace TravelWise.API.Services.Auth;

public class AdminProvisioningService
{
    private readonly TravelWiseDbContext _context;
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminProvisioningService> _logger;

    public AdminProvisioningService(
        TravelWiseDbContext context,
        AuthService authService,
        IConfiguration configuration,
        ILogger<AdminProvisioningService> logger)
    {
        _context = context;
        _authService = authService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> ProvisionInitialAdminAsync()
    {
        // 1. Read environment variables first, falling back to configuration
        var adminEmail = Environment.GetEnvironmentVariable("TRAVELWISE_ADMIN_EMAIL")
            ?? _configuration["TRAVELWISE_ADMIN_EMAIL"]
            ?? _configuration["Admin:Email"];

        var adminPassword = Environment.GetEnvironmentVariable("TRAVELWISE_ADMIN_PASSWORD")
            ?? _configuration["TRAVELWISE_ADMIN_PASSWORD"]
            ?? _configuration["Admin:Password"];

        var adminName = Environment.GetEnvironmentVariable("TRAVELWISE_ADMIN_NAME")
            ?? _configuration["TRAVELWISE_ADMIN_NAME"]
            ?? _configuration["Admin:Name"];

        // 2. Only proceed if required credentials are configured
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            _logger.LogInformation("Admin provisioning: Skipped (TRAVELWISE_ADMIN_EMAIL or TRAVELWISE_ADMIN_PASSWORD not set).");
            return false;
        }

        var normalizedEmail = adminEmail.Trim().ToLowerInvariant();

        if (adminPassword.Length < 6)
        {
            _logger.LogWarning("Admin provisioning: Skipped because the provided password does not meet the minimum length of 6 characters.");
            return false;
        }

        // 3. Check if an account with this email already exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (existingUser != null)
        {
            // Requirement 7: Never overwrite an existing Admin password automatically on application startup.
            _logger.LogInformation("Admin provisioning: User with email '{Email}' already exists. Preserving existing account without modification.", normalizedEmail);
            return false;
        }

        // 4. Derive username safely from name or email
        var rawName = !string.IsNullOrWhiteSpace(adminName) ? adminName.Trim() : "System Administrator";
        var baseUsername = !string.IsNullOrWhiteSpace(adminName) && !adminName.Contains('@')
            ? adminName.Trim().ToLowerInvariant().Replace(" ", "")
            : normalizedEmail.Split('@')[0];

        var username = baseUsername;
        var suffix = 1;
        while (await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
        {
            username = $"{baseUsername}{suffix++}";
        }

        // 5. Hash password using the EXACT SAME AuthService hashing mechanism (PBKDF2 HMAC-SHA256)
        var passwordHash = _authService.HashPassword(adminPassword);

        // 6. Create the Admin user with Role = "Admin"
        var adminUser = new User
        {
            Username = username,
            Email = normalizedEmail,
            FullName = rawName,
            PasswordHash = passwordHash,
            Role = "Admin",
            HasCompletedOnboarding = true,
            TravelStyle = "Balanced",
            Interests = "Governance,Auditing,Analytics",
            BudgetStyle = "Premium",
            ActivityPace = "Packed",
            TransportPreference = "Car",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(adminUser);
        await _context.SaveChangesAsync();

        // Requirement 8: Never print the Admin password to logs.
        _logger.LogInformation("Admin provisioning: Initial administrator account successfully provisioned for '{Email}' with Role 'Admin'.", normalizedEmail);
        return true;
    }
}
