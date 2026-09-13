using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TravelWise.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowPersistence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIWorkflows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TripId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ApprovalStatus = table.Column<string>(type: "text", nullable: false),
                    ValidationPassed = table.Column<bool>(type: "boolean", nullable: false),
                    Reviewer = table.Column<string>(type: "text", nullable: true),
                    ApprovalComment = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIWorkflows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIWorkflows_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowAuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AIWorkflowId = table.Column<int>(type: "integer", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Actor = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkflowAuditLogs_AIWorkflows_AIWorkflowId",
                        column: x => x.AIWorkflowId,
                        principalTable: "AIWorkflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AIWorkflows_TripId",
                table: "AIWorkflows",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowAuditLogs_AIWorkflowId",
                table: "WorkflowAuditLogs",
                column: "AIWorkflowId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkflowAuditLogs");

            migrationBuilder.DropTable(
                name: "AIWorkflows");
        }
    }
}
