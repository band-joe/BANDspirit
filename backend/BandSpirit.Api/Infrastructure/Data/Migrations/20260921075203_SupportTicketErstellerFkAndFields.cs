using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SupportTicketErstellerFkAndFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // text -> uuid hat keinen impliziten Cast in PostgreSQL; explizites
            // USING noetig (unabhaengig von der tatsaechlichen Zeilenanzahl).
            // NULLIF behandelt einen etwaigen Leerstring defensiv als NULL.
            migrationBuilder.Sql(
                "ALTER TABLE \"SupportTickets\" ALTER COLUMN \"ErstellerId\" TYPE uuid USING NULLIF(\"ErstellerId\", '')::uuid;");

            migrationBuilder.AddColumn<string>(
                name: "Antwort",
                table: "SupportTickets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kategorie",
                table: "SupportTickets",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_ErstellerId",
                table: "SupportTickets",
                column: "ErstellerId");

            migrationBuilder.AddForeignKey(
                name: "FK_SupportTickets_Users_ErstellerId",
                table: "SupportTickets",
                column: "ErstellerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SupportTickets_Users_ErstellerId",
                table: "SupportTickets");

            migrationBuilder.DropIndex(
                name: "IX_SupportTickets_ErstellerId",
                table: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "Antwort",
                table: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "Kategorie",
                table: "SupportTickets");

            migrationBuilder.Sql(
                "ALTER TABLE \"SupportTickets\" ALTER COLUMN \"ErstellerId\" TYPE text USING \"ErstellerId\"::text;");
        }
    }
}
