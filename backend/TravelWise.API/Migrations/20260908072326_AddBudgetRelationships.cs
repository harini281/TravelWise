using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWise.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Expenses_BudgetCategoryId",
                table: "Expenses",
                column: "BudgetCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TripId",
                table: "Expenses",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_TripId",
                table: "Budgets",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_BudgetCategories_BudgetId",
                table: "BudgetCategories",
                column: "BudgetId");

            migrationBuilder.AddForeignKey(
                name: "FK_BudgetCategories_Budgets_BudgetId",
                table: "BudgetCategories",
                column: "BudgetId",
                principalTable: "Budgets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Trips_TripId",
                table: "Budgets",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_BudgetCategories_BudgetCategoryId",
                table: "Expenses",
                column: "BudgetCategoryId",
                principalTable: "BudgetCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Trips_TripId",
                table: "Expenses",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BudgetCategories_Budgets_BudgetId",
                table: "BudgetCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Trips_TripId",
                table: "Budgets");

            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_BudgetCategories_BudgetCategoryId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Trips_TripId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_BudgetCategoryId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_TripId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_TripId",
                table: "Budgets");

            migrationBuilder.DropIndex(
                name: "IX_BudgetCategories_BudgetId",
                table: "BudgetCategories");
        }
    }
}
