using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCircleRoleUniqueAndOwnerChecks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleKennzahlen_GenauEinOwner",
                table: "S3RolleKennzahlen",
                sql: "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleDokumente_GenauEinOwner",
                table: "S3RolleDokumente",
                sql: "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_S3Roles_CircleId_RollenDefinitionId",
                table: "S3Roles",
                columns: new[] { "CircleId", "RollenDefinitionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleKennzahlen_GenauEinOwner",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleDokumente_GenauEinOwner",
                table: "S3RolleDokumente");

            migrationBuilder.DropIndex(
                name: "IX_S3Roles_CircleId_RollenDefinitionId",
                table: "S3Roles");
        }
    }
}
