using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveErlaubtMehrfachbesetzung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ErlaubtMehrfachbesetzung",
                table: "S3RollenDefinitionen");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ErlaubtMehrfachbesetzung",
                table: "S3RollenDefinitionen",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
