using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class S3RolleDetailAnRollenDefinition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleVerantwortlichkeiten",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleVerantwortlichkeiten",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleChecklisten",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RollenDefinitionId",
                table: "S3RolleChecklisten",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleVerantwortlichkeiten_RollenDefinitionId",
                table: "S3RolleVerantwortlichkeiten",
                column: "RollenDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleKennzahlen_RollenDefinitionId",
                table: "S3RolleKennzahlen",
                column: "RollenDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleDokumente_RollenDefinitionId",
                table: "S3RolleDokumente",
                column: "RollenDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleChecklisten_RollenDefinitionId",
                table: "S3RolleChecklisten",
                column: "RollenDefinitionId");

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleChecklisten_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleChecklisten",
                column: "RollenDefinitionId",
                principalTable: "S3RollenDefinitionen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleDokumente_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleDokumente",
                column: "RollenDefinitionId",
                principalTable: "S3RollenDefinitionen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleKennzahlen_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleKennzahlen",
                column: "RollenDefinitionId",
                principalTable: "S3RollenDefinitionen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_S3RolleVerantwortlichkeiten_S3RollenDefinitionen_RollenDefi~",
                table: "S3RolleVerantwortlichkeiten",
                column: "RollenDefinitionId",
                principalTable: "S3RollenDefinitionen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleChecklisten_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleChecklisten");

            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleDokumente_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleDokumente");

            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleKennzahlen_S3RollenDefinitionen_RollenDefinitionId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropForeignKey(
                name: "FK_S3RolleVerantwortlichkeiten_S3RollenDefinitionen_RollenDefi~",
                table: "S3RolleVerantwortlichkeiten");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleVerantwortlichkeiten_RollenDefinitionId",
                table: "S3RolleVerantwortlichkeiten");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleKennzahlen_RollenDefinitionId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleDokumente_RollenDefinitionId",
                table: "S3RolleDokumente");

            migrationBuilder.DropIndex(
                name: "IX_S3RolleChecklisten_RollenDefinitionId",
                table: "S3RolleChecklisten");

            migrationBuilder.DropColumn(
                name: "RollenDefinitionId",
                table: "S3RolleVerantwortlichkeiten");

            migrationBuilder.DropColumn(
                name: "RollenDefinitionId",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropColumn(
                name: "RollenDefinitionId",
                table: "S3RolleDokumente");

            migrationBuilder.DropColumn(
                name: "RollenDefinitionId",
                table: "S3RolleChecklisten");

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleVerantwortlichkeiten",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleKennzahlen",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleDokumente",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "S3RolleChecklisten",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
