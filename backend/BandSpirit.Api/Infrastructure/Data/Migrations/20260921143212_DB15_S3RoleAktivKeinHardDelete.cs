using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DB15_S3RoleAktivKeinHardDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // WICHTIG: defaultValue MUSS true sein (EF generiert hier standardmässig
            // den CLR-Default `false`, nicht den C#-Property-Initializer `= true`).
            // Andernfalls würden alle 162 bestehenden Rollen rückwirkend als
            // deaktiviert markiert und aus der aktiven Übersicht verschwinden.
            migrationBuilder.AddColumn<bool>(
                name: "Aktiv",
                table: "S3Roles",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aktiv",
                table: "S3Roles");
        }
    }
}
