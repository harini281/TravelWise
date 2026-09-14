using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWise.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTripPlanningAndAdminSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelectedTransport",
                table: "Trips",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "EstimatedDistanceKm",
                table: "Trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedDurationMinutes",
                table: "Trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedTransportCost",
                table: "Trips",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "StartLatitude",
                table: "Trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "StartLongitude",
                table: "Trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DestinationLatitude",
                table: "Trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DestinationLongitude",
                table: "Trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RouteGeometryJson",
                table: "Trips",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "IsActive", table: "Users");
            migrationBuilder.DropColumn(name: "UserId", table: "Trips");
            migrationBuilder.DropColumn(name: "SelectedTransport", table: "Trips");
            migrationBuilder.DropColumn(name: "EstimatedDistanceKm", table: "Trips");
            migrationBuilder.DropColumn(name: "EstimatedDurationMinutes", table: "Trips");
            migrationBuilder.DropColumn(name: "EstimatedTransportCost", table: "Trips");
            migrationBuilder.DropColumn(name: "StartLatitude", table: "Trips");
            migrationBuilder.DropColumn(name: "StartLongitude", table: "Trips");
            migrationBuilder.DropColumn(name: "DestinationLatitude", table: "Trips");
            migrationBuilder.DropColumn(name: "DestinationLongitude", table: "Trips");
            migrationBuilder.DropColumn(name: "RouteGeometryJson", table: "Trips");
        }
    }
}
