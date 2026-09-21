using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DeadCodeCleanup_RemoveInstanceRoleId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleDokumente_S3Roles_RoleId",
                table: "S3RolleDokumente");

            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleKennzahlen_S3Roles_RoleId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleKennzahlen_RoleId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleKennzahlen_GenauEinOwner",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleDokumente_RoleId",
                table: "S3RolleDokumente");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleDokumente_GenauEinOwner",
                table: "S3RolleDokumente");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "S3RolleDokumente");

            migrationBuilder.AlterColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleKennzahlen_RoleId",
                table: "S3RolleKennzahlen",
                column: "RoleId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleKennzahlen_GenauEinOwner",
                table: "S3RolleKennzahlen",
                sql: "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleDokumente_RoleId",
                table: "S3RolleDokumente",
                column: "RoleId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleDokumente_GenauEinOwner",
                table: "S3RolleDokumente",
                sql: "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleDokumente_S3Roles_RoleId",
                table: "S3RolleDokumente",
                column: "RoleId",
                principalTable: "S3Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleKennzahlen_S3Roles_RoleId",
                table: "S3RolleKennzahlen",
                column: "RoleId",
                principalTable: "S3Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
