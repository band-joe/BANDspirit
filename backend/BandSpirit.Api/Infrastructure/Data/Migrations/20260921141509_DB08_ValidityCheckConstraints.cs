using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BandSpirit.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DB08_ValidityCheckConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_GueltigAbVorGueltigBis",
                table: "Users",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SupportTickets_GueltigAbVorGueltigBis",
                table: "SupportTickets",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Stammdaten_GueltigAbVorGueltigBis",
                table: "Stammdaten",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SpannungWorkItems_GueltigAbVorGueltigBis",
                table: "SpannungWorkItems",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RollenDefinitionen_GueltigAbVorGueltigBis",
                table: "S3RollenDefinitionen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleKennzahlen_GueltigAbVorGueltigBis",
                table: "S3RolleKennzahlen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3RolleDokumente_GueltigAbVorGueltigBis",
                table: "S3RolleDokumente",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Roles_GueltigAbVorGueltigBis",
                table: "S3Roles",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Proposals_GueltigAbVorGueltigBis",
                table: "S3Proposals",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3PersonRoleAssignments_GueltigAbVorGueltigBis",
                table: "S3PersonRoleAssignments",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Objections_GueltigAbVorGueltigBis",
                table: "S3Objections",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Meetings_GueltigAbVorGueltigBis",
                table: "S3Meetings",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3MeetingAgendaItems_GueltigAbVorGueltigBis",
                table: "S3MeetingAgendaItems",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3LebenszyklusPhasen_GueltigAbVorGueltigBis",
                table: "S3LebenszyklusPhasen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Drivers_GueltigAbVorGueltigBis",
                table: "S3Drivers",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Decisions_GueltigAbVorGueltigBis",
                table: "S3Decisions",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3Circles_GueltigAbVorGueltigBis",
                table: "S3Circles",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3CircleReviews_GueltigAbVorGueltigBis",
                table: "S3CircleReviews",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_S3CircleLebenszyklen_GueltigAbVorGueltigBis",
                table: "S3CircleLebenszyklen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RolePermissions_GueltigAbVorGueltigBis",
                table: "RolePermissions",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PasswordResetTokens_GueltigAbVorGueltigBis",
                table: "PasswordResetTokens",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OkrZyklen_GueltigAbVorGueltigBis",
                table: "OkrZyklen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OKRs_GueltigAbVorGueltigBis",
                table: "OKRs",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MailVerteilerBenutzer_GueltigAbVorGueltigBis",
                table: "MailVerteilerBenutzer",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MailVerteiler_GueltigAbVorGueltigBis",
                table: "MailVerteiler",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_KpiMeasurements_GueltigAbVorGueltigBis",
                table: "KpiMeasurements",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_KpiDefinitions_GueltigAbVorGueltigBis",
                table: "KpiDefinitions",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_KeyResults_GueltigAbVorGueltigBis",
                table: "KeyResults",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Firmas_GueltigAbVorGueltigBis",
                table: "Firmas",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FAQs_GueltigAbVorGueltigBis",
                table: "FAQs",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BIKompassVersionen_GueltigAbVorGueltigBis",
                table: "BIKompassVersionen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BIGuideNews_GueltigAbVorGueltigBis",
                table: "BIGuideNews",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BiGuideKategorien_GueltigAbVorGueltigBis",
                table: "BiGuideKategorien",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BenutzerRollen_GueltigAbVorGueltigBis",
                table: "BenutzerRollen",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppLogs_GueltigAbVorGueltigBis",
                table: "AppLogs",
                sql: "\"DateFrom\" IS NULL OR \"DateTo\" IS NULL OR \"DateFrom\" <= \"DateTo\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_GueltigAbVorGueltigBis",
                table: "Users");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SupportTickets_GueltigAbVorGueltigBis",
                table: "SupportTickets");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Stammdaten_GueltigAbVorGueltigBis",
                table: "Stammdaten");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SpannungWorkItems_GueltigAbVorGueltigBis",
                table: "SpannungWorkItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RollenDefinitionen_GueltigAbVorGueltigBis",
                table: "S3RollenDefinitionen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleKennzahlen_GueltigAbVorGueltigBis",
                table: "S3RolleKennzahlen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3RolleDokumente_GueltigAbVorGueltigBis",
                table: "S3RolleDokumente");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Roles_GueltigAbVorGueltigBis",
                table: "S3Roles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Proposals_GueltigAbVorGueltigBis",
                table: "S3Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3PersonRoleAssignments_GueltigAbVorGueltigBis",
                table: "S3PersonRoleAssignments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Objections_GueltigAbVorGueltigBis",
                table: "S3Objections");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Meetings_GueltigAbVorGueltigBis",
                table: "S3Meetings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3MeetingAgendaItems_GueltigAbVorGueltigBis",
                table: "S3MeetingAgendaItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3LebenszyklusPhasen_GueltigAbVorGueltigBis",
                table: "S3LebenszyklusPhasen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Drivers_GueltigAbVorGueltigBis",
                table: "S3Drivers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Decisions_GueltigAbVorGueltigBis",
                table: "S3Decisions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3Circles_GueltigAbVorGueltigBis",
                table: "S3Circles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3CircleReviews_GueltigAbVorGueltigBis",
                table: "S3CircleReviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_S3CircleLebenszyklen_GueltigAbVorGueltigBis",
                table: "S3CircleLebenszyklen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RolePermissions_GueltigAbVorGueltigBis",
                table: "RolePermissions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PasswordResetTokens_GueltigAbVorGueltigBis",
                table: "PasswordResetTokens");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OkrZyklen_GueltigAbVorGueltigBis",
                table: "OkrZyklen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OKRs_GueltigAbVorGueltigBis",
                table: "OKRs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MailVerteilerBenutzer_GueltigAbVorGueltigBis",
                table: "MailVerteilerBenutzer");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MailVerteiler_GueltigAbVorGueltigBis",
                table: "MailVerteiler");

            migrationBuilder.DropCheckConstraint(
                name: "CK_KpiMeasurements_GueltigAbVorGueltigBis",
                table: "KpiMeasurements");

            migrationBuilder.DropCheckConstraint(
                name: "CK_KpiDefinitions_GueltigAbVorGueltigBis",
                table: "KpiDefinitions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_KeyResults_GueltigAbVorGueltigBis",
                table: "KeyResults");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Firmas_GueltigAbVorGueltigBis",
                table: "Firmas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FAQs_GueltigAbVorGueltigBis",
                table: "FAQs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BIKompassVersionen_GueltigAbVorGueltigBis",
                table: "BIKompassVersionen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BIGuideNews_GueltigAbVorGueltigBis",
                table: "BIGuideNews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BiGuideKategorien_GueltigAbVorGueltigBis",
                table: "BiGuideKategorien");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BenutzerRollen_GueltigAbVorGueltigBis",
                table: "BenutzerRollen");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppLogs_GueltigAbVorGueltigBis",
                table: "AppLogs");
        }
    }
}
