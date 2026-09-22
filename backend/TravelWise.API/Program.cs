using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TravelWise.API.Data;
using TravelWise.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------
// Controllers & Auth Service
// ---------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("destinations", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "shared",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddHttpClient("Destinations", client => client.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddSingleton(new GeoapifyOptions(Environment.GetEnvironmentVariable("GEOAPIFY_API_KEY") ?? builder.Configuration["GEOAPIFY_API_KEY"]));
builder.Services.AddSingleton<GeoapifyRequestBudget>();
builder.Services.AddHttpClient<GeoapifyService>(client =>
{
    client.BaseAddress = new Uri("https://api.geoapify.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
})
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false })
    .RemoveAllLoggers(); // Geoapify uses a secret query parameter; never log request URLs.
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// ---------------------------------------------------------
// JWT Authentication
// ---------------------------------------------------------

var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET") ??
    builder.Configuration["Jwt:Key"] ??
    throw new InvalidOperationException("Configure JWT_SECRET or Jwt:Key before starting the API.");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ??
    builder.Configuration["Jwt:Issuer"] ??
    "TravelWiseAPI";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ??
    builder.Configuration["Jwt:Audience"] ??
    "TravelWiseClient";

// Token generation and validation must use the same resolved configuration.
builder.Configuration["Jwt:Key"] = jwtKey;
builder.Configuration["Jwt:Issuer"] = jwtIssuer;
builder.Configuration["Jwt:Audience"] = jwtAudience;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ---------------------------------------------------------
// Swagger with Bearer Support
// ---------------------------------------------------------

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TravelWise API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});


// ---------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------

var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") ??
    builder.Configuration.GetConnectionString("TravelWiseDb");

builder.Services.AddDbContext<TravelWiseDbContext>(options =>
    options.UseNpgsql(connectionString)
);


// ---------------------------------------------------------
// CORS - allow frontend clients
// ---------------------------------------------------------

var configuredOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"]?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries) ??
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
    new[]
    {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:4173",
        "http://localhost:3000"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactFrontend", policy =>
    {
        policy
            .WithOrigins(configuredOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


// ---------------------------------------------------------
// Weather API HTTP Client
// ---------------------------------------------------------

builder.Services
    .AddHttpClient<WeatherService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);

        client.DefaultRequestHeaders.UserAgent.ParseAdd(
            "TravelWise/1.0"
        );
    })
    .ConfigurePrimaryHttpMessageHandler(() =>
        new HttpClientHandler
        {
            // Avoid problematic Windows/system proxy
            // for Open-Meteo requests.
            UseProxy = false
        });


// ---------------------------------------------------------
// Agentic AI Service HTTP Client (LangGraph Python Service)
// ---------------------------------------------------------

var aiServiceUrl = Environment.GetEnvironmentVariable("AISERVICE_URL") ??
    builder.Configuration["AIService:BaseUrl"] ??
    "http://localhost:8000";

builder.Services
    .AddHttpClient<AIServiceClient>(client =>
    {
        client.BaseAddress = new Uri(aiServiceUrl);
        client.Timeout = TimeSpan.FromSeconds(45);
    });


// ---------------------------------------------------------
// Build application
// ---------------------------------------------------------

var app = builder.Build();

// Ensure User table schema has onboarding and preference columns
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TravelWiseDbContext>();
    try
    {
        if (db.Database.IsRelational())
        {
            await db.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""FullName"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""PasswordResetToken"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""PasswordResetExpiry"" timestamp with time zone;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""HasCompletedOnboarding"" boolean DEFAULT false NOT NULL;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""TravelStyle"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""Interests"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""BudgetStyle"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""ActivityPace"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""TransportPreference"" text;
                ALTER TABLE IF EXISTS ""Users"" ADD COLUMN IF NOT EXISTS ""IsActive"" boolean DEFAULT true NOT NULL;

                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""UserId"" integer;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""SelectedTransport"" text;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""EstimatedDistanceKm"" double precision;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""EstimatedDurationMinutes"" integer;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""EstimatedTransportCost"" numeric;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""StartLatitude"" double precision;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""StartLongitude"" double precision;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""DestinationLatitude"" double precision;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""DestinationLongitude"" double precision;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""RouteGeometryJson"" text;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""CompletedAt"" timestamp with time zone;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""CompletionMethod"" text;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""TravelScope"" text DEFAULT 'Local' NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""PassportRequired"" boolean DEFAULT false NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""TravelInsuranceRequired"" boolean DEFAULT false NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""ReadinessChecksComplete"" boolean DEFAULT false NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""BaggagePlan"" text;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""SpentAmount"" numeric DEFAULT 0 NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""FoodBudget"" numeric DEFAULT 0 NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""AccommodationBudget"" numeric DEFAULT 0 NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""NightlyAccommodationRate"" numeric;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""ReturnBudgetReserve"" numeric DEFAULT 0 NOT NULL;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""OriginalReturnDate"" timestamp with time zone;
                ALTER TABLE IF EXISTS ""Trips"" ADD COLUMN IF NOT EXISTS ""ReturnTransport"" text;
            ");
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Schema initialization check completed.");
    }
}


// ---------------------------------------------------------
// Swagger
// ---------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}


// Allow React frontend to call ASP.NET API
app.UseRouting();
app.UseCors("ReactFrontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();


// ---------------------------------------------------------
// Controllers
// ---------------------------------------------------------

app.MapControllers();


// ---------------------------------------------------------
// Run
// ---------------------------------------------------------

app.Run();
