using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetsController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public BudgetsController(TravelWiseDbContext context)
    {
        _context = context;
    }

    [HttpPost]
public async Task<ActionResult<Budget>> CreateBudget(CreateBudgetDto dto)
{
    var tripExists = await _context.Trips.AnyAsync(t => t.Id == dto.TripId);

    if (!tripExists)
    {
        return NotFound($"Trip with ID {dto.TripId} was not found.");
    }

    var budget = new Budget
    {
        TripId = dto.TripId,
        TotalAmount = dto.TotalAmount,
        Currency = dto.Currency,
        DailyBudget = dto.DailyBudget
    };

    _context.Budgets.Add(budget);

    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(CreateBudget), new { id = budget.Id }, budget);
}

[HttpGet("{id}/health")]
public async Task<ActionResult<BudgetHealthDto>> GetBudgetHealth(int id)
{
    var budget = await _context.Budgets
        .FindAsync(id);

    if (budget == null)
    {
        return NotFound($"Budget with ID {id} was not found.");
    }

    var totalSpent = await _context.Expenses
        .Where(e => e.TripId == budget.TripId)
        .SumAsync(e => e.Amount);

    var remainingBudget = budget.TotalAmount - totalSpent;

    var spendingPercentage = budget.TotalAmount > 0
        ? (totalSpent / budget.TotalAmount) * 100
        : 0;

    var budgetHealth = spendingPercentage switch
    {
        < 50 => "HEALTHY",
        < 80 => "MODERATE",
        < 100 => "WARNING",
        _ => "OVERSPENT"
    };

    var result = new BudgetHealthDto
    {
        BudgetId = budget.Id,
        TotalBudget = budget.TotalAmount,
        TotalSpent = totalSpent,
        RemainingBudget = remainingBudget,
        SpendingPercentage = Math.Round(spendingPercentage, 2),
        BudgetHealth = budgetHealth
    };

    return Ok(result);
}
[HttpGet("{id}/details")]
public async Task<ActionResult<BudgetDetailsDto>> GetBudgetDetails(int id)
{
    var budget = await _context.Budgets
        .FindAsync(id);

    if (budget == null)
    {
        return NotFound($"Budget with ID {id} was not found.");
    }

    var categories = await _context.BudgetCategories
        .Where(c => c.BudgetId == id)
        .Select(c => new BudgetCategoryDetailsDto
        {
            Id = c.Id,
            Name = c.Name,
            AllocatedAmount = c.AllocatedAmount
        })
        .ToListAsync();

    var expenses = await _context.Expenses
        .Where(e => e.TripId == budget.TripId)
        .Select(e => new ExpenseDetailsDto
        {
            Id = e.Id,
            BudgetCategoryId = e.BudgetCategoryId,
            Amount = e.Amount,
            Description = e.Description,
            ExpenseDate = e.ExpenseDate,
            PaymentMethod = e.PaymentMethod
        })
        .ToListAsync();

    var result = new BudgetDetailsDto
    {
        Id = budget.Id,
        TripId = budget.TripId,
        TotalAmount = budget.TotalAmount,
        Currency = budget.Currency,
        DailyBudget = budget.DailyBudget,
        BudgetStatus = budget.BudgetStatus,
        Categories = categories,
        Expenses = expenses
    };

    return Ok(result);
}
}