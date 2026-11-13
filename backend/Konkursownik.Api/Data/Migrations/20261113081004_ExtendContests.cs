using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExtendContests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Purchases",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Proofs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "Contests",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Note",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Proofs");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "Contests");
        }
    }
}
