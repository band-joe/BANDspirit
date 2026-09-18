using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLebenszyklus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "S3LebenszyklusPhasen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Beschreibung = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Aktiv = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3LebenszyklusPhasen", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "S3CircleLebenszyklen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    S3CircleId = table.Column<Guid>(type: "uuid", nullable: false),
                    LebenszyklusPhaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDatum = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Bemerkung = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3CircleLebenszyklen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3CircleLebenszyklen_S3Circles_S3CircleId",
                        column: x => x.S3CircleId,
                        principalTable: "S3Circles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_S3CircleLebenszyklen_S3LebenszyklusPhasen_LebenszyklusPhase~",
                        column: x => x.LebenszyklusPhaseId,
                        principalTable: "S3LebenszyklusPhasen",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_S3CircleLebenszyklen_LebenszyklusPhaseId",
                table: "S3CircleLebenszyklen",
                column: "LebenszyklusPhaseId");

            migrationBuilder.CreateIndex(
                name: "IX_S3CircleLebenszyklen_S3CircleId",
                table: "S3CircleLebenszyklen",
                column: "S3CircleId");

            migrationBuilder.CreateIndex(
                name: "IX_S3CircleLebenszyklen_StartDatum",
                table: "S3CircleLebenszyklen",
                column: "StartDatum");

            migrationBuilder.CreateIndex(
                name: "IX_S3LebenszyklusPhasen_Aktiv",
                table: "S3LebenszyklusPhasen",
                column: "Aktiv");

            migrationBuilder.CreateIndex(
                name: "IX_S3LebenszyklusPhasen_Name",
                table: "S3LebenszyklusPhasen",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "S3CircleLebenszyklen");

            migrationBuilder.DropTable(
                name: "S3LebenszyklusPhasen");
        }
    }
}
