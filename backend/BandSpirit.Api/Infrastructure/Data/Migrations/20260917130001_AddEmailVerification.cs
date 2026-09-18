using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// K81/K83: Email-Verification für Signup.
    /// Fügt EmailVerified (bool), VerificationToken (string), VerificationTokenExpiry (DateTime) hinzu.
    /// K83: Neu generiert inkl. Designer + Snapshot (die ursprüngliche K81-Migration war
    /// unvollständig und wurde von EF Core nicht angewendet → Login-401).
    /// </summary>
    public partial class AddEmailVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EmailVerified",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "VerificationToken",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationTokenExpiry",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            // K81/K83: Bestehende Benutzer gelten als bereits verifiziert (kein Re-Onboarding).
            // Verhindert, dass sich vorhandene Accounts nach dem Update nicht mehr anmelden können.
            migrationBuilder.Sql("UPDATE \"Users\" SET \"EmailVerified\" = true WHERE \"EmailVerified\" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmailVerified",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerificationToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerificationTokenExpiry",
                table: "Users");
        }
    }
}
