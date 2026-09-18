using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase2Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VerantwortlicherUserId",
                table: "OKRs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ZyklusId",
                table: "OKRs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kommentar",
                table: "KpiMeasurements",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Massnahme",
                table: "KpiMeasurements",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Datenquelle",
                table: "KpiDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kategorie",
                table: "KpiDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Richtung",
                table: "KpiDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerantwortlicherUserId",
                table: "KpiDefinitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Zielwert",
                table: "KpiDefinitions",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "KeyResults",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "OkrZyklen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Titel = table.Column<string>(type: "text", nullable: false),
                    StartDatum = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDatum = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Aktiv = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OkrZyklen", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OKRs_ZyklusId",
                table: "OKRs",
                column: "ZyklusId");

            migrationBuilder.AddForeignKey(
                name: "FK_OKRs_OkrZyklen_ZyklusId",
                table: "OKRs",
                column: "ZyklusId",
                principalTable: "OkrZyklen",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OKRs_OkrZyklen_ZyklusId",
                table: "OKRs");

            migrationBuilder.DropTable(
                name: "OkrZyklen");

            migrationBuilder.DropIndex(
                name: "IX_OKRs_ZyklusId",
                table: "OKRs");

            migrationBuilder.DropColumn(
                name: "VerantwortlicherUserId",
                table: "OKRs");

            migrationBuilder.DropColumn(
                name: "ZyklusId",
                table: "OKRs");

            migrationBuilder.DropColumn(
                name: "Kommentar",
                table: "KpiMeasurements");

            migrationBuilder.DropColumn(
                name: "Massnahme",
                table: "KpiMeasurements");

            migrationBuilder.DropColumn(
                name: "Datenquelle",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "Kategorie",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "Richtung",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "VerantwortlicherUserId",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "Zielwert",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "KeyResults");
        }
    }
}
