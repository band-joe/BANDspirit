using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DriverAndWorkItemFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Beschreibung",
                table: "SpannungWorkItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ZugewiesenAnId",
                table: "SpannungWorkItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Prioritaet",
                table: "S3Drivers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "S3Drivers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_SpannungWorkItems_ZugewiesenAnId",
                table: "SpannungWorkItems",
                column: "ZugewiesenAnId");

            migrationBuilder.AddForeignKey(
                name: "FK_SpannungWorkItems_Users_ZugewiesenAnId",
                table: "SpannungWorkItems",
                column: "ZugewiesenAnId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SpannungWorkItems_Users_ZugewiesenAnId",
                table: "SpannungWorkItems");

            migrationBuilder.DropIndex(
                name: "IX_SpannungWorkItems_ZugewiesenAnId",
                table: "SpannungWorkItems");

            migrationBuilder.DropColumn(
                name: "Beschreibung",
                table: "SpannungWorkItems");

            migrationBuilder.DropColumn(
                name: "ZugewiesenAnId",
                table: "SpannungWorkItems");

            migrationBuilder.DropColumn(
                name: "Prioritaet",
                table: "S3Drivers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "S3Drivers");
        }
    }
}
