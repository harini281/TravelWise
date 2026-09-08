using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;


namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetCategoriesController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public BudgetCategoriesController(TravelWiseDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<BudgetCategory>> CreateCategory(
        CreateBudgetCategoryDto dto)
    {
        var budget = await _context.Budgets
            .FindAsync(dto.BudgetId);

        if (budget == null)
        {
            return NotFound(
                $"Budget with ID {dto.BudgetId} was not found.");
        }

        var existingAllocatedAmount = await _context.BudgetCategories
            .Where(c => c.BudgetId == dto.BudgetId)
            .SumAsync(c => c.AllocatedAmount);

        if (existingAllocatedAmount + dto.AllocatedAmount > budget.TotalAmount)
        {
            return BadRequest(
                "Category allocation exceeds the total budget.");
        }

        var category = new BudgetCategory
        {
            BudgetId = dto.BudgetId,
            Name = dto.Name,
            AllocatedAmount = dto.AllocatedAmount
        };

        _context.BudgetCategories.Add(category);

        await _context.SaveChangesAsync();

        return Ok(category);
    }
      
    [HttpGet]
     public async Task<ActionResult<IEnumerable<BudgetCategory>>> GetCategories()
{
    return await _context.BudgetCategories.ToListAsync();
}
}
