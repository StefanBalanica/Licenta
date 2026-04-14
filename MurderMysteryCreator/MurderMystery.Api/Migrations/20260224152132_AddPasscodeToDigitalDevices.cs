using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MurderMystery.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasscodeToDigitalDevices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Passcode",
                table: "DigitalDevices",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Passcode",
                table: "DigitalDevices");
        }
    }
}
