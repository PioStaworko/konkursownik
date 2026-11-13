using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Konkursownik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class EntryStorePhotoLabel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Label",
                table: "Photos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Store",
                table: "Entries",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Label",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Store",
                table: "Entries");
        }
    }
}
