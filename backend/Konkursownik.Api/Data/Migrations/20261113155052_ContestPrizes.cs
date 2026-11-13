using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ContestPrizes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContestPrizes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    Count = table.Column<int>(type: "integer", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContestPrizes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContestPrizes_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContestPrizes_ContestId",
                table: "ContestPrizes",
                column: "ContestId");

            migrationBuilder.Sql("""
                INSERT INTO "ContestPrizes" ("Id", "ContestId", "Name", "Value", "Count", "Order")
                SELECT gen_random_uuid(), "Id", LEFT(COALESCE(NULLIF(TRIM("PrizeDescription"), ''), 'Nagroda'), 200),
                       CASE WHEN "PrizeValue" >= 0 THEN "PrizeValue" END,
                       CASE WHEN "PrizeCount" > 0 THEN "PrizeCount" END, 0
                FROM "Contests"
                WHERE NULLIF(TRIM("PrizeDescription"),'') IS NOT NULL OR "PrizeValue" IS NOT NULL
                """);

            migrationBuilder.DropColumn(
                name: "PrizeCount",
                table: "Contests");

            migrationBuilder.DropColumn(
                name: "PrizeDescription",
                table: "Contests");

            migrationBuilder.DropColumn(
                name: "PrizeValue",
                table: "Contests");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrizeCount",
                table: "Contests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrizeDescription",
                table: "Contests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PrizeValue",
                table: "Contests",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Contests" c
                SET "PrizeDescription" = p."Name", "PrizeValue" = p."Value", "PrizeCount" = p."Count"
                FROM (
                    SELECT DISTINCT ON ("ContestId") "ContestId", "Name", "Value", "Count"
                    FROM "ContestPrizes"
                    ORDER BY "ContestId", "Order"
                ) p
                WHERE p."ContestId" = c."Id"
                """);

            migrationBuilder.DropTable(
                name: "ContestPrizes");
        }
    }
}
