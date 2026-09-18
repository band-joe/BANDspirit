using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailVerteiler : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MailVerteiler",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Beschreibung = table.Column<string>(type: "text", nullable: true),
                    Typ = table.Column<string>(type: "text", nullable: false),
                    S3CircleId = table.Column<Guid>(type: "uuid", nullable: true),
                    S3RollenDefinitionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MailVerteiler", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MailVerteilerBenutzer",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MailVerteilerId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MailVerteilerBenutzer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MailVerteilerBenutzer_MailVerteiler_MailVerteilerId",
                        column: x => x.MailVerteilerId,
                        principalTable: "MailVerteiler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MailVerteilerBenutzer_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteiler_Name",
                table: "MailVerteiler",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteiler_Typ",
                table: "MailVerteiler",
                column: "Typ");

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteilerBenutzer_MailVerteilerId_UserId",
                table: "MailVerteilerBenutzer",
                columns: new[] { "MailVerteilerId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteilerBenutzer_UserId",
                table: "MailVerteilerBenutzer",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MailVerteilerBenutzer");

            migrationBuilder.DropTable(
                name: "MailVerteiler");
        }
    }
}
