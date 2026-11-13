using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class WinPrizeId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrizeId",
                table: "Wins",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Wins_PrizeId",
                table: "Wins",
                column: "PrizeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Wins_ContestPrizes_PrizeId",
                table: "Wins",
                column: "PrizeId",
                principalTable: "ContestPrizes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Wins_ContestPrizes_PrizeId",
                table: "Wins");

            migrationBuilder.DropIndex(
                name: "IX_Wins_PrizeId",
                table: "Wins");

            migrationBuilder.DropColumn(
                name: "PrizeId",
                table: "Wins");
        }
    }
}
