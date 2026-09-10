using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// PostgreSQL
builder.Services.AddDbContext<TravelWiseDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("TravelWiseDb")));

// Weather API HTTP client
builder.Services
    .AddHttpClient<WeatherService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);

        client.DefaultRequestHeaders.UserAgent.ParseAdd(
            "TravelWise/1.0");
    })
    .ConfigurePrimaryHttpMessageHandler(() =>
        new HttpClientHandler
        {
            // Avoid problematic Windows/system proxy
            // for this external weather request.
            UseProxy = false
        });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();