using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------
// Controllers
// ---------------------------------------------------------

builder.Services.AddControllers();


// ---------------------------------------------------------
// Swagger
// ---------------------------------------------------------

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


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
            .WithOrigins("http://localhost:5173")
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


// ---------------------------------------------------------
// Controllers
// ---------------------------------------------------------

app.MapControllers();


// ---------------------------------------------------------
// Run
// ---------------------------------------------------------

app.Run();