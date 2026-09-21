using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DB01_AddMissingForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_S3Objections_UserId",
                table: "S3Objections",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteiler_S3CircleId",
                table: "MailVerteiler",
                column: "S3CircleId");

            migrationBuilder.CreateIndex(
                name: "IX_MailVerteiler_S3RollenDefinitionId",
                table: "MailVerteiler",
                column: "S3RollenDefinitionId");

            migrationBuilder.AddForeignKey(
                name: "FK_MailVerteiler_S3Circles_S3CircleId",
                table: "MailVerteiler",
                column: "S3CircleId",
                principalTable: "S3Circles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_MailVerteiler_S3RollenDefinitionen_S3RollenDefinitionId",
                table: "MailVerteiler",
                column: "S3RollenDefinitionId",
                principalTable: "S3RollenDefinitionen",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_S3Objections_Users_UserId",
                table: "S3Objections",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MailVerteiler_S3Circles_S3CircleId",
                table: "MailVerteiler");

            migrationBuilder.DropForeignKey(
                name: "FK_MailVerteiler_S3RollenDefinitionen_S3RollenDefinitionId",
                table: "MailVerteiler");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_S3Objections_Users_UserId",
                table: "S3Objections");

            migrationBuilder.DropIndex(
                name: "IX_S3Objections_UserId",
                table: "S3Objections");

            migrationBuilder.DropIndex(
                name: "IX_MailVerteiler_S3CircleId",
                table: "MailVerteiler");

            migrationBuilder.DropIndex(
                name: "IX_MailVerteiler_S3RollenDefinitionId",
                table: "MailVerteiler");
        }
    }
}
