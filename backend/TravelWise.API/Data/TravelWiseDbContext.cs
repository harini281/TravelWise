using Microsoft.EntityFrameworkCore;
using TravelWise.API.Models;


namespace TravelWise.API.Data;

public class TravelWiseDbContext : DbContext
{
    public TravelWiseDbContext(DbContextOptions<TravelWiseDbContext> options)
        : base(options)
    {
    }
    public DbSet<Trip> Trips { get; set; }
     
    public DbSet<Budget> Budgets { get; set; }
    

    public DbSet<BudgetCategory> BudgetCategories { get; set; }

    public DbSet<Expense> Expenses { get; set; }

    public DbSet<Activity> Activities { get; set; }

    public DbSet<RiskAssessment> RiskAssessments { get; set; }
    public DbSet<WeatherData> WeatherData { get; set; }

    public DbSet<TravelRequirement> TravelRequirements { get; set; }
public DbSet<ReadinessItem> ReadinessItems { get; set; }
public DbSet<ReadinessAssessment> ReadinessAssessments { get; set; }

public DbSet<AIWorkflow> AIWorkflows { get; set; }
public DbSet<WorkflowAuditLog> WorkflowAuditLogs { get; set; }
   
   
}
