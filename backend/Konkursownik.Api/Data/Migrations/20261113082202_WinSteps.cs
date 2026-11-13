using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class WinSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WinSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WinId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Done = table.Column<bool>(type: "boolean", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinSteps_Wins_WinId",
                        column: x => x.WinId,
                        principalTable: "Wins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WinSteps_WinId",
                table: "WinSteps",
                column: "WinId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WinSteps");
        }
    }
}
