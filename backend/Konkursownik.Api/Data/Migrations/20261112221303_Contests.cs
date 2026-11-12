using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Contests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Contests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Organizer = table.Column<string>(type: "text", nullable: true),
                    Url = table.Column<string>(type: "text", nullable: true),
                    RulesUrl = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    PrizeDescription = table.Column<string>(type: "text", nullable: true),
                    PrizeValue = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    PrizeCount = table.Column<int>(type: "integer", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ResultsDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ResultsCheckNote = table.Column<string>(type: "text", nullable: true),
                    EntryLimitPerDay = table.Column<int>(type: "integer", nullable: true),
                    EntryLimitTotal = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contests_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    ConfirmationCode = table.Column<string>(type: "text", nullable: true),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    PurchaseAmount = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    ContactUsed = table.Column<string>(type: "text", nullable: true),
                    AnswerText = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Entries_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Proofs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    What = table.Column<string>(type: "text", nullable: false),
                    KeepUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Location = table.Column<string>(type: "text", nullable: true),
                    Discarded = table.Column<bool>(type: "boolean", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proofs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Proofs_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Purchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Product = table.Column<string>(type: "text", nullable: false),
                    Store = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<string>(type: "text", nullable: true),
                    Bought = table.Column<bool>(type: "boolean", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Purchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Purchases_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    Done = table.Column<bool>(type: "boolean", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tasks_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Wins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    PrizeWon = table.Column<string>(type: "text", nullable: false),
                    PrizeValue = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    LaureateDeadline = table.Column<DateOnly>(type: "date", nullable: true),
                    LaureateDataSent = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Wins_Contests_ContestId",
                        column: x => x.ContestId,
                        principalTable: "Contests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Photos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Photos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Photos_Entries_EntryId",
                        column: x => x.EntryId,
                        principalTable: "Entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contests_OwnerId",
                table: "Contests",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Entries_ContestId",
                table: "Entries",
                column: "ContestId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_EntryId",
                table: "Photos",
                column: "EntryId");

            migrationBuilder.CreateIndex(
                name: "IX_Proofs_ContestId",
                table: "Proofs",
                column: "ContestId");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_ContestId",
                table: "Purchases",
                column: "ContestId");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ContestId",
                table: "Tasks",
                column: "ContestId");

            migrationBuilder.CreateIndex(
                name: "IX_Wins_ContestId",
                table: "Wins",
                column: "ContestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Photos");

            migrationBuilder.DropTable(
                name: "Proofs");

            migrationBuilder.DropTable(
                name: "Purchases");

            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropTable(
                name: "Wins");

            migrationBuilder.DropTable(
                name: "Entries");

            migrationBuilder.DropTable(
                name: "Contests");
        }
    }
}
