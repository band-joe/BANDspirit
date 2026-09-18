using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCircleIdToKpiAndOkr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CircleId",
                table: "OKRs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CircleId",
                table: "KpiDefinitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OKRs_CircleId",
                table: "OKRs",
                column: "CircleId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDefinitions_CircleId",
                table: "KpiDefinitions",
                column: "CircleId");

            migrationBuilder.AddForeignKey(
                name: "FK_KpiDefinitions_S3Circles_CircleId",
                table: "KpiDefinitions",
                column: "CircleId",
                principalTable: "S3Circles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_OKRs_S3Circles_CircleId",
                table: "OKRs",
                column: "CircleId",
                principalTable: "S3Circles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KpiDefinitions_S3Circles_CircleId",
                table: "KpiDefinitions");

            migrationBuilder.DropForeignKey(
                name: "FK_OKRs_S3Circles_CircleId",
                table: "OKRs");

            migrationBuilder.DropIndex(
                name: "IX_OKRs_CircleId",
                table: "OKRs");

            migrationBuilder.DropIndex(
                name: "IX_KpiDefinitions_CircleId",
                table: "KpiDefinitions");

            migrationBuilder.DropColumn(
                name: "CircleId",
                table: "OKRs");

            migrationBuilder.DropColumn(
                name: "CircleId",
                table: "KpiDefinitions");
        }
    }
}
