using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public ExpensesController(TravelWiseDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> CreateExpense(CreateExpenseDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId);
        if (trip == null)
        {
            return NotFound($"Trip with ID {dto.TripId} was not found.");
        }

        // Ensure Budget exists for this Trip
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == dto.TripId);
        if (budget == null)
        {
            budget = new Budget
            {
                TripId = dto.TripId,
                TotalAmount = trip.BudgetAmount,
                Currency = "LKR",
                BudgetStatus = trip.BudgetAmount > 0 ? "HEALTHY" : "UNSET",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Budgets.Add(budget);
            await _context.SaveChangesAsync();
        }

        // Find or create category for this budget
        BudgetCategory? category = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.Id == dto.BudgetCategoryId && c.BudgetId == budget.Id);

        if (category == null)
        {
            // Try resolving by standard category mapping
            string categoryName = dto.BudgetCategoryId switch
            {
                1 => "Transport",
                2 => "Accommodation",
                3 => "Food",
                4 => "Activities",
                5 => "Emergency",
                6 => "Return Journey",
                _ => "Other"
            };

            category = await _context.BudgetCategories
                .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name.ToLower() == categoryName.ToLower());

            if (category == null)
            {
                category = new BudgetCategory
                {
                    BudgetId = budget.Id,
                    Name = categoryName,
                    AllocatedAmount = Math.Max(dto.Amount * 2, 5000m),
                    CreatedAt = DateTime.UtcNow
                };
                _context.BudgetCategories.Add(category);
                await _context.SaveChangesAsync();
            }
        }

        var categorySpent = await _context.Expenses
            .Where(e => e.BudgetCategoryId == category.Id)
            .SumAsync(e => e.Amount);

        if (category.AllocatedAmount > 0 && categorySpent + dto.Amount > category.AllocatedAmount)
        {
            return BadRequest("Expense exceeds the allocated budget for this category.");
        }

        var expense = new Expense
        {
            TripId = dto.TripId,
            BudgetCategoryId = category.Id,
            Amount = dto.Amount,
            Description = dto.Description,
            ExpenseDate = DateTime.SpecifyKind(dto.ExpenseDate, DateTimeKind.Utc),
            PaymentMethod = dto.PaymentMethod,
            CreatedAt = DateTime.UtcNow
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // Recalculate trip spent amount
        var updatedTotalSpent = await _context.Expenses
            .Where(e => e.TripId == dto.TripId)
            .SumAsync(e => e.Amount);

        trip.SpentAmount = updatedTotalSpent;
        await _context.SaveChangesAsync();

        return Ok(expense);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
    {
        return await _context.Expenses.OrderByDescending(e => e.ExpenseDate).ToListAsync();
    }

    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpensesByTrip(int tripId)
    {
        var tripExists = await _context.Trips.AnyAsync(t => t.Id == tripId);
        if (!tripExists)
        {
            return NotFound($"Trip with ID {tripId} was not found.");
        }

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .OrderByDescending(e => e.ExpenseDate)
            .ToListAsync();

        return Ok(expenses);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Expense>> UpdateExpense(int id, UpdateExpenseDto dto)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null)
        {
            return NotFound($"Expense with ID {id} was not found.");
        }

        expense.Amount = dto.Amount;
        expense.Description = dto.Description;
        expense.ExpenseDate = DateTime.SpecifyKind(dto.ExpenseDate, DateTimeKind.Utc);
        expense.PaymentMethod = dto.PaymentMethod;

        await _context.SaveChangesAsync();

        // Recalculate trip spent amount
        var trip = await _context.Trips.FindAsync(expense.TripId);
        if (trip != null)
        {
            var updatedTotalSpent = await _context.Expenses
                .Where(e => e.TripId == expense.TripId)
                .SumAsync(e => e.Amount);

            trip.SpentAmount = updatedTotalSpent;
            await _context.SaveChangesAsync();
        }

        return Ok(expense);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null)
        {
            return NotFound($"Expense with ID {id} was not found.");
        }

        int tripId = expense.TripId;
        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();

        // Recalculate trip spent amount
        var trip = await _context.Trips.FindAsync(tripId);
        if (trip != null)
        {
            var updatedTotalSpent = await _context.Expenses
                .Where(e => e.TripId == tripId)
                .SumAsync(e => e.Amount);

            trip.SpentAmount = updatedTotalSpent;
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }
}
