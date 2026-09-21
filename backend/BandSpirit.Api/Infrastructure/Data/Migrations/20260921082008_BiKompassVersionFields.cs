using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class BiKompassVersionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Version",
                table: "BIKompassVersionen",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "Aenderungen",
                table: "BIKompassVersionen",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aenderungen",
                table: "BIKompassVersionen");

            migrationBuilder.AlterColumn<int>(
                name: "Version",
                table: "BIKompassVersionen",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
