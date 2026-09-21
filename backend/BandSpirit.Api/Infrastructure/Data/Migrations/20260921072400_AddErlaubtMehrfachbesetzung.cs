using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddErlaubtMehrfachbesetzung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ErlaubtMehrfachbesetzung",
                table: "S3RollenDefinitionen",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // APP-17-Fix: Backfill, damit sich das bisherige Verhalten (nur die
            // Rollendefinition "Mitglied" erlaubte mehrere Inhaber, siehe die
            // zuvor namensbasierte Prüfung in RolesController.Assign) durch
            // diese Migration NICHT ändert. Ab jetzt ist dieses Feld die
            // alleinige Quelle der Wahrheit, unabhängig vom (änderbaren) Namen.
            migrationBuilder.Sql(
                "UPDATE \"S3RollenDefinitionen\" SET \"ErlaubtMehrfachbesetzung\" = true WHERE \"Name\" = 'Mitglied';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ErlaubtMehrfachbesetzung",
                table: "S3RollenDefinitionen");
        }
    }
}
