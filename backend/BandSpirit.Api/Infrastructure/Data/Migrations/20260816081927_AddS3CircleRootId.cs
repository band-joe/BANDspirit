using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddS3CircleRootId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RootId",
                table: "S3Circles",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_S3Circles_RootId",
                table: "S3Circles",
                column: "RootId");

            migrationBuilder.AddForeignKey(
                name: "FK_S3Circles_S3Circles_RootId",
                table: "S3Circles",
                column: "RootId",
                principalTable: "S3Circles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Bestehende Kreise mit RootId befüllen: jeder Kreis erhält die Id
            // seines obersten Vorfahren (Wurzelkreise verweisen auf sich selbst).
            migrationBuilder.Sql(@"
                WITH RECURSIVE tree AS (
                    SELECT ""Id"", ""ParentId"", ""Id"" AS ""RootId""
                    FROM ""S3Circles""
                    WHERE ""ParentId"" IS NULL
                    UNION ALL
                    SELECT c.""Id"", c.""ParentId"", t.""RootId""
                    FROM ""S3Circles"" c
                    JOIN tree t ON c.""ParentId"" = t.""Id""
                )
                UPDATE ""S3Circles"" s
                SET ""RootId"" = tree.""RootId""
                FROM tree
                WHERE s.""Id"" = tree.""Id"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_S3Circles_S3Circles_RootId",
                table: "S3Circles");

            migrationBuilder.DropIndex(
                name: "IX_S3Circles_RootId",
                table: "S3Circles");

            migrationBuilder.DropColumn(
                name: "RootId",
                table: "S3Circles");
        }
    }
}
