using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBiGuideKategorie : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BiGuideKategorien",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Farbe = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_BiGuideKategorien", x => x.Id);
                });

            // Standardkategorien einfügen (nur wenn noch keine vorhanden) – idempotent.
            migrationBuilder.Sql(@"
INSERT INTO ""BiGuideKategorien"" (""Id"", ""Name"", ""Farbe"", ""SortOrder"", ""Aktiv"", ""CreatedAt"", ""UpdatedAt"", ""CreatedById"", ""ChangedById"")
SELECT gen_random_uuid(), name, farbe, sort_order, true, NOW(), NOW(), 'system', 'system'
FROM (VALUES
  ('Allgemein',     'bg-slate-100 text-slate-700 border-slate-200',   1),
  ('Prozesse',      'bg-blue-50 text-blue-700 border-blue-200',        2),
  ('Schulung',      'bg-purple-50 text-purple-700 border-purple-200',  3),
  ('Änderungen',    'bg-amber-50 text-amber-700 border-amber-200',     4),
  ('Tipps & Tricks','bg-emerald-50 text-emerald-700 border-emerald-200',5),
  ('Beschlüsse',    'bg-red-50 text-red-700 border-red-200',           6),
  ('Aufträge',      'bg-orange-50 text-orange-700 border-orange-200',  7)
) AS t(name, farbe, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ""BiGuideKategorien"" LIMIT 1);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BiGuideKategorien");
        }
    }
}
