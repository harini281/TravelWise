using TravelWise.API.Models;
using Microsoft.EntityFrameworkCore;


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
}