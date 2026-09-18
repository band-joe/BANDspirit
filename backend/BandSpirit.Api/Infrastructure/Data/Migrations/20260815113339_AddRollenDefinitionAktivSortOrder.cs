using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRollenDefinitionAktivSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bestehende Rollendefinitionen sollen nach dem Upgrade aktiv bleiben,
            // daher defaultValue: true (Soft-Delete-Flag).
            migrationBuilder.AddColumn<bool>(
                name: "Aktiv",
                table: "S3RollenDefinitionen",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "S3RollenDefinitionen",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aktiv",
                table: "S3RollenDefinitionen");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "S3RollenDefinitionen");
        }
    }
}
