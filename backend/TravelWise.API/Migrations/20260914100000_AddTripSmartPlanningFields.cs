using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWise.API.Migrations;

public partial class AddTripSmartPlanningFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("TravelScope", "Trips", nullable: false, defaultValue: "Local");
        migrationBuilder.AddColumn<bool>("PassportRequired", "Trips", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<bool>("TravelInsuranceRequired", "Trips", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<bool>("ReadinessChecksComplete", "Trips", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<string>("BaggagePlan", "Trips", nullable: true);
        migrationBuilder.AddColumn<decimal>("SpentAmount", "Trips", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<decimal>("FoodBudget", "Trips", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<decimal>("ReturnBudgetReserve", "Trips", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<DateTime>("OriginalReturnDate", "Trips", nullable: true);
        migrationBuilder.AddColumn<string>("ReturnTransport", "Trips", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("TravelScope", "Trips");
        migrationBuilder.DropColumn("PassportRequired", "Trips");
        migrationBuilder.DropColumn("TravelInsuranceRequired", "Trips");
        migrationBuilder.DropColumn("ReadinessChecksComplete", "Trips");
        migrationBuilder.DropColumn("BaggagePlan", "Trips");
        migrationBuilder.DropColumn("SpentAmount", "Trips");
        migrationBuilder.DropColumn("FoodBudget", "Trips");
        migrationBuilder.DropColumn("ReturnBudgetReserve", "Trips");
        migrationBuilder.DropColumn("OriginalReturnDate", "Trips");
        migrationBuilder.DropColumn("ReturnTransport", "Trips");
    }
}
