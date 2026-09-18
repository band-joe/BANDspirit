using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddS3RolleDetailTabs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Domaene",
                table: "S3RollenDefinitionen",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Zweck",
                table: "S3RollenDefinitionen",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "S3RolleChecklisten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleChecklisten", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3RolleChecklisten_S3Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "S3Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "S3RolleDokumente",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Dateiname = table.Column<string>(type: "text", nullable: false),
                    StoragePfad = table.Column<string>(type: "text", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: false),
                    DateigroesseBytes = table.Column<long>(type: "bigint", nullable: false),
                    HochgeladenAm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleDokumente", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3RolleDokumente_S3Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "S3Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "S3RolleKennzahlen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Bezeichnung = table.Column<string>(type: "text", nullable: false),
                    Zielwert = table.Column<string>(type: "text", nullable: true),
                    Einheit = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleKennzahlen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3RolleKennzahlen_S3Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "S3Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "S3RolleVerantwortlichkeiten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleVerantwortlichkeiten", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3RolleVerantwortlichkeiten_S3Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "S3Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "S3RolleChecklistePunkte",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChecklisteId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    Erledigt = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleChecklistePunkte", x => x.Id);
                    table.ForeignKey(
                        name: "FK_S3RolleChecklistePunkte_S3RolleChecklisten_ChecklisteId",
                        column: x => x.ChecklisteId,
                        principalTable: "S3RolleChecklisten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleChecklisten_RoleId",
                table: "S3RolleChecklisten",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleChecklistePunkte_ChecklisteId",
                table: "S3RolleChecklistePunkte",
                column: "ChecklisteId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleDokumente_RoleId",
                table: "S3RolleDokumente",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleKennzahlen_RoleId",
                table: "S3RolleKennzahlen",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_S3RolleVerantwortlichkeiten_RoleId",
                table: "S3RolleVerantwortlichkeiten",
                column: "RoleId");

            // Bestehende Freitext-Verantwortlichkeiten (Feld "Responsible") in einzelne
            // Datensätze umwandeln. HTML wird entfernt, Zeilenumbrüche (<br>, <li>) trennen Einträge.
            migrationBuilder.Sql(@"
                INSERT INTO ""S3RolleVerantwortlichkeiten"" (""Id"",""RoleId"",""Text"",""SortOrder"",""CreatedAt"",""UpdatedAt"")
                SELECT gen_random_uuid(), r.""Id"",
                    trim(regexp_replace(zeile, '<[^>]+>', '', 'g')),
                    row_number() OVER (PARTITION BY r.""Id"" ORDER BY ordinality),
                    now(), now()
                FROM ""S3Roles"" r,
                     unnest(string_to_array(
                         regexp_replace(regexp_replace(r.""Responsible"", '<br\s*/?>', E'\n', 'gi'), '<li[^>]*>', E'\n', 'gi'),
                         E'\n')) WITH ORDINALITY AS t(zeile)
                WHERE r.""Responsible"" IS NOT NULL AND r.""Responsible"" <> ''
                  AND length(trim(regexp_replace(zeile, '<[^>]+>', '', 'g'))) > 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "S3RolleChecklistePunkte");

            migrationBuilder.DropTable(
                name: "S3RolleDokumente");

            migrationBuilder.DropTable(
                name: "S3RolleKennzahlen");

            migrationBuilder.DropTable(
                name: "S3RolleVerantwortlichkeiten");

            migrationBuilder.DropTable(
                name: "S3RolleChecklisten");

            migrationBuilder.DropColumn(
                name: "Domaene",
                table: "S3RollenDefinitionen");

            migrationBuilder.DropColumn(
                name: "Zweck",
                table: "S3RollenDefinitionen");
        }
    }
}
