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
    public async Task<ActionResult<Expense>> CreateExpense(
        CreateExpenseDto dto)
    {
        var tripExists = await _context.Trips
            .AnyAsync(t => t.Id == dto.TripId);

        if (!tripExists)
        {
            return NotFound(
                $"Trip with ID {dto.TripId} was not found.");
        }

        var category = await _context.BudgetCategories
            .FirstOrDefaultAsync(c =>
                c.Id == dto.BudgetCategoryId);

        if (category == null)
        {
            return NotFound(
                $"Budget category with ID {dto.BudgetCategoryId} was not found.");
        }

        var categorySpent = await _context.Expenses
    .Where(e => e.BudgetCategoryId == dto.BudgetCategoryId)
    .SumAsync(e => e.Amount);

     if (categorySpent + dto.Amount > category.AllocatedAmount)
     {
    return BadRequest(
        "Expense exceeds the allocated budget for this category.");
    }

        var expense = new Expense
        {
            TripId = dto.TripId,
            BudgetCategoryId = dto.BudgetCategoryId,
            Amount = dto.Amount,
            Description = dto.Description,
            ExpenseDate = dto.ExpenseDate,
            PaymentMethod = dto.PaymentMethod
        };

        _context.Expenses.Add(expense);

        await _context.SaveChangesAsync();

        return Ok(expense);
    }
    [HttpGet]
     public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
   {
    return await _context.Expenses.ToListAsync();
   }
   [HttpGet("trip/{tripId}")]
public async Task<ActionResult<IEnumerable<Expense>>> GetExpensesByTrip(int tripId)
{
    var tripExists = await _context.Trips
        .AnyAsync(t => t.Id == tripId);

    if (!tripExists)
    {
        return NotFound($"Trip with ID {tripId} was not found.");
    }

    var expenses = await _context.Expenses
        .Where(e => e.TripId == tripId)
        .ToListAsync();

    return Ok(expenses);
}
[HttpPut("{id}")]
public async Task<ActionResult<Expense>> UpdateExpense(
    int id,
    UpdateExpenseDto dto)
{
    var expense = await _context.Expenses
        .FindAsync(id);

    if (expense == null)
    {
        return NotFound($"Expense with ID {id} was not found.");
    }

    var category = await _context.BudgetCategories
        .FindAsync(expense.BudgetCategoryId);

    if (category == null)
    {
        return NotFound(
            $"Budget category with ID {expense.BudgetCategoryId} was not found.");
    }

    var categorySpent = await _context.Expenses
        .Where(e =>
            e.BudgetCategoryId == expense.BudgetCategoryId &&
            e.Id != id)
        .SumAsync(e => e.Amount);

    if (categorySpent + dto.Amount > category.AllocatedAmount)
    {
        return BadRequest(
            "Updated expense exceeds the allocated budget for this category.");
    }

    expense.Amount = dto.Amount;
    expense.Description = dto.Description;
    expense.ExpenseDate = dto.ExpenseDate;
    expense.PaymentMethod = dto.PaymentMethod;

    await _context.SaveChangesAsync();

    return Ok(expense);
}

[HttpDelete("{id}")]
public async Task<IActionResult> DeleteExpense(int id)
{
    var expense = await _context.Expenses
        .FindAsync(id);

    if (expense == null)
    {
        return NotFound($"Expense with ID {id} was not found.");
    }

    _context.Expenses.Remove(expense);

    await _context.SaveChangesAsync();

    return NoContent();
}
}
