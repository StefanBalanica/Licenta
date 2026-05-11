using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TheInvestigation.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceRonToGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PriceRon",
                table: "Games",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PriceRon",
                table: "Games");
        }
    }
}
