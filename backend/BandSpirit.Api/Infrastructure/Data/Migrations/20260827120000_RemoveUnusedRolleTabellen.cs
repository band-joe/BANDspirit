using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnusedRolleTabellen : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tabellenreihenfolge: zuerst abhängige (ChecklistePunkte), dann Eltern
            migrationBuilder.DropTable(name: "S3RolleChecklistePunkte");
            migrationBuilder.DropTable(name: "S3RolleChecklisten");
            migrationBuilder.DropTable(name: "S3RolleVerantwortlichkeiten");

            // Altes Freitext-Feld Responsible aus S3Roles entfernen
            migrationBuilder.DropColumn(name: "Responsible", table: "S3Roles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Responsible",
                table: "S3Roles",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "S3RolleVerantwortlichkeiten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: true),
                    RollenDefinitionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Text = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleVerantwortlichkeiten", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "S3RolleChecklisten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: true),
                    RollenDefinitionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<string>(type: "text", nullable: true),
                    ChangedById = table.Column<string>(type: "text", nullable: true),
                    DateFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_S3RolleChecklisten", x => x.Id);
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
                    DateTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
        }
    }
}
