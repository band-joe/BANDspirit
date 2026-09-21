using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CircleReviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Massnahmen",
                table: "S3CircleReviews",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notizen",
                table: "S3CircleReviews",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Massnahmen",
                table: "S3CircleReviews");

            migrationBuilder.DropColumn(
                name: "Notizen",
                table: "S3CircleReviews");
        }
    }
}
