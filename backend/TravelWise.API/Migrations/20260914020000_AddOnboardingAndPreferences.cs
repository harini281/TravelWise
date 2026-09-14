using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWise.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingAndPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetToken",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetExpiry",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasCompletedOnboarding",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TravelStyle",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Interests",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BudgetStyle",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActivityPace",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransportPreference",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "FullName", table: "Users");
            migrationBuilder.DropColumn(name: "PasswordResetToken", table: "Users");
            migrationBuilder.DropColumn(name: "PasswordResetExpiry", table: "Users");
            migrationBuilder.DropColumn(name: "HasCompletedOnboarding", table: "Users");
            migrationBuilder.DropColumn(name: "TravelStyle", table: "Users");
            migrationBuilder.DropColumn(name: "Interests", table: "Users");
            migrationBuilder.DropColumn(name: "BudgetStyle", table: "Users");
            migrationBuilder.DropColumn(name: "ActivityPace", table: "Users");
            migrationBuilder.DropColumn(name: "TransportPreference", table: "Users");
        }
    }
}
