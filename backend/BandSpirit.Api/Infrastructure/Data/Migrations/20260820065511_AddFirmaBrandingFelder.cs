using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFirmaBrandingFelder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppName",
                table: "Firmas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hausnummer",
                table: "Firmas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LogoPublic",
                table: "Firmas",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Versionsnummer",
                table: "Firmas",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppName",
                table: "Firmas");

            migrationBuilder.DropColumn(
                name: "Hausnummer",
                table: "Firmas");

            migrationBuilder.DropColumn(
                name: "LogoPublic",
                table: "Firmas");

            migrationBuilder.DropColumn(
                name: "Versionsnummer",
                table: "Firmas");
        }
    }
}
