using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DB02_AddStableRoleId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "RolePermissions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId",
                table: "RolePermissions",
                column: "RoleId");

            // DB-02-Fix: Bestandsdaten anhand des expliziten Namens-zu-ID-Mappings
            // rückwirkend auflösen (Recommended correction: "explicit name-to-ID
            // mapping"), bevor die FK-Constraints unten aktiv werden. Zeilen ohne
            // passende BenutzerRollen-Zeile bleiben bewusst NULL statt zu einer
            // falschen ID zu raten - Autorisierung liest weiterhin den unveränderten
            // Role-Namen, ist von einer fehlenden RoleId also nicht betroffen.
            migrationBuilder.Sql(
                "UPDATE \"Users\" u SET \"RoleId\" = br.\"Id\" " +
                "FROM \"BenutzerRollen\" br WHERE br.\"Name\" = u.\"Role\";");
            migrationBuilder.Sql(
                "UPDATE \"RolePermissions\" p SET \"RoleId\" = br.\"Id\" " +
                "FROM \"BenutzerRollen\" br WHERE br.\"Name\" = p.\"Role\";");

            migrationBuilder.AddForeignKey(
                name: "FK_RolePermissions_BenutzerRollen_RoleId",
                table: "RolePermissions",
                column: "RoleId",
                principalTable: "BenutzerRollen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_BenutzerRollen_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "BenutzerRollen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RolePermissions_BenutzerRollen_RoleId",
                table: "RolePermissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_BenutzerRollen_RoleId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_RoleId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_RolePermissions_RoleId",
                table: "RolePermissions");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "RolePermissions");
        }
    }
}
