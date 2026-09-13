using System.Text;
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
builder.Services.AddScoped<AuthService>();

// ---------------------------------------------------------
// JWT Authentication
// ---------------------------------------------------------

var jwtKey = builder.Configuration["Jwt:Key"] ?? "TravelWiseSuperSecretSecureKeyForUniversityVivaDemo2026!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TravelWiseAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TravelWiseClient";

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

builder.Services.AddDbContext<TravelWiseDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("TravelWiseDb")
    )
);


// ---------------------------------------------------------
// CORS - allow React frontend
// ---------------------------------------------------------

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174"
            )
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

builder.Services
    .AddHttpClient<AIServiceClient>(client =>
    {
        client.BaseAddress = new Uri("http://localhost:8000");
        client.Timeout = TimeSpan.FromSeconds(45);
    });


// ---------------------------------------------------------
// Build application
// ---------------------------------------------------------

var app = builder.Build();


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

app.UseHttpsRedirection();


// Allow React frontend to call ASP.NET API
app.UseCors("ReactFrontend");

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