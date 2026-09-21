using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MeetingProposalObjectionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_S3Decisions_ProposalId",
                table: "S3Decisions");

            migrationBuilder.AddColumn<string>(
                name: "DomainReference",
                table: "S3Objections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Observation",
                table: "S3Objections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Risk",
                table: "S3Objections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "EndedAt",
                table: "S3Meetings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "S3Meetings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "S3Meetings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_S3Proposals_MeetingId",
                table: "S3Proposals",
                column: "MeetingId");

            migrationBuilder.CreateIndex(
                name: "IX_S3Decisions_ProposalId",
                table: "S3Decisions",
                column: "ProposalId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_S3Proposals_S3Meetings_MeetingId",
                table: "S3Proposals",
                column: "MeetingId",
                principalTable: "S3Meetings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_S3Proposals_S3Meetings_MeetingId",
                table: "S3Proposals");

            migrationBuilder.DropIndex(
                name: "IX_S3Proposals_MeetingId",
                table: "S3Proposals");

            migrationBuilder.DropIndex(
                name: "IX_S3Decisions_ProposalId",
                table: "S3Decisions");

            migrationBuilder.DropColumn(
                name: "DomainReference",
                table: "S3Objections");

            migrationBuilder.DropColumn(
                name: "Observation",
                table: "S3Objections");

            migrationBuilder.DropColumn(
                name: "Risk",
                table: "S3Objections");

            migrationBuilder.DropColumn(
                name: "EndedAt",
                table: "S3Meetings");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "S3Meetings");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "S3Meetings");

            migrationBuilder.CreateIndex(
                name: "IX_S3Decisions_ProposalId",
                table: "S3Decisions",
                column: "ProposalId");
        }
    }
}
