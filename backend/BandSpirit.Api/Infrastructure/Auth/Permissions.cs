namespace BandSpirit.Api.Infrastructure.Auth;

/// <summary>
/// Zentrale Sammlung aller Berechtigungs-Strings (Permissions) des Systems.
/// Werden für Authorization-Policies und das RBAC-Seeding verwendet.
/// </summary>
public static class Permissions
{
    // Benutzerverwaltung
    public const string UserRead = "user:read";
    public const string UserCreate = "user:create";
    public const string UserUpdate = "user:update";
    public const string UserDelete = "user:delete";
    public const string UserManage = "user:manage";

    // Organisation – Kreise
    public const string CircleRead = "org:circle:read";
    public const string CircleCreate = "org:circle:create";
    public const string CircleUpdate = "org:circle:update";
    public const string CircleDelete = "org:circle:delete";

    // Organisation – Rollen
    public const string RoleRead = "org:role:read";
    public const string RoleCreate = "org:role:create";
    public const string RoleUpdate = "org:role:update";
    public const string RoleAssign = "org:role:assign";
    public const string RoleUnassign = "org:role:unassign";

    // Organisation – Meetings
    public const string MeetingRead = "org:meeting:read";
    public const string MeetingCreate = "org:meeting:create";

    // Governance
    public const string ProposalCreate = "org:proposal:create";
    public const string ObjectionCreate = "org:objection:create";
    public const string ObjectionUpdate = "org:objection:update";
    public const string DecisionCreate = "org:decision:create";
    public const string DriverRead = "org:driver:read";
    public const string DriverCreate = "org:driver:create";
    public const string DriverUpdate = "org:driver:update";

    // BI-Guide / BI-Kompass
    public const string BiGuideRead = "biguide:read";
    public const string BiGuideManage = "biguide:manage";

    // Support / FAQ
    public const string TicketCreate = "ticket:create";
    public const string TicketRead = "ticket:read";
    public const string TicketUpdate = "ticket:update";
    public const string FaqRead = "faq:read";
    public const string FaqManage = "faq:manage";

    // Kennzahlen (KPIs)
    public const string KpiRead = "kpi:read";
    public const string KpiManage = "kpi:manage";
    public const string KpiMeasure = "kpi:measure";

    // Ziele (OKRs)
    public const string OkrRead = "okr:read";
    public const string OkrManage = "okr:manage";

    // Sonstiges
    public const string StammdatenManage = "stammdaten:manage";
    public const string DashboardRead = "dashboard:read";
    public const string AppLogRead = "applog:read";
    public const string DocsRead = "docs:read";

    /// <summary>Liefert alle definierten Berechtigungen als Liste.</summary>
    public static IReadOnlyList<string> All => new[]
    {
        UserRead, UserCreate, UserUpdate, UserDelete, UserManage,
        CircleRead, CircleCreate, CircleUpdate, CircleDelete,
        RoleRead, RoleCreate, RoleUpdate, RoleAssign, RoleUnassign,
        MeetingRead, MeetingCreate,
        ProposalCreate, ObjectionCreate, ObjectionUpdate, DecisionCreate,
        DriverRead, DriverCreate, DriverUpdate,
        BiGuideRead, BiGuideManage,
        TicketCreate, TicketRead, TicketUpdate, FaqRead, FaqManage,
        KpiRead, KpiManage, KpiMeasure, OkrRead, OkrManage,
        StammdatenManage, DashboardRead, AppLogRead, DocsRead
    };

    /// <summary>Deutschsprachige Bezeichnungen für alle Berechtigungen.</summary>
    public static IReadOnlyDictionary<string, string> Labels => new Dictionary<string, string>
    {
        [UserRead] = "Benutzer anzeigen",
        [UserCreate] = "Benutzer erstellen",
        [UserUpdate] = "Benutzer bearbeiten",
        [UserDelete] = "Benutzer löschen",
        [UserManage] = "Benutzerverwaltung",
        [CircleRead] = "Kreise anzeigen",
        [CircleCreate] = "Kreise erstellen",
        [CircleUpdate] = "Kreise bearbeiten",
        [CircleDelete] = "Kreise löschen",
        [RoleRead] = "Rollen anzeigen",
        [RoleCreate] = "Rollen erstellen",
        [RoleUpdate] = "Rollen bearbeiten",
        [RoleAssign] = "Rollen zuweisen",
        [RoleUnassign] = "Rollenzuweisung aufheben",
        [MeetingRead] = "Meetings anzeigen",
        [MeetingCreate] = "Meetings erstellen",
        [ProposalCreate] = "Proposals erstellen",
        [ObjectionCreate] = "Einwände erstellen",
        [ObjectionUpdate] = "Einwände bearbeiten",
        [DecisionCreate] = "Entscheidungen erfassen",
        [DriverRead] = "Treiber anzeigen",
        [DriverCreate] = "Treiber erstellen",
        [DriverUpdate] = "Treiber bearbeiten",
        [BiGuideRead] = "BI-Guide anzeigen",
        [BiGuideManage] = "BI-Guide verwalten",
        [TicketCreate] = "Tickets erstellen",
        [TicketRead] = "Tickets anzeigen",
        [TicketUpdate] = "Tickets bearbeiten",
        [FaqRead] = "FAQ anzeigen",
        [FaqManage] = "FAQ verwalten",
        [KpiRead] = "Kennzahlen anzeigen",
        [KpiManage] = "Kennzahlen verwalten",
        [KpiMeasure] = "Messwerte erfassen",
        [OkrRead] = "Ziele (OKR) anzeigen",
        [OkrManage] = "Ziele (OKR) verwalten",
        [StammdatenManage] = "Stammdaten verwalten",
        [DashboardRead] = "Dashboard anzeigen",
        [AppLogRead] = "Protokolle anzeigen",
        [DocsRead] = "Dokumentation anzeigen"
    };

    /// <summary>Fachliche Gruppierung der Berechtigungen für die Berechtigungsverwaltung.</summary>
    public static IReadOnlyList<PermissionGroup> Groups => new[]
    {
        new PermissionGroup
        {
            Label = "Benutzerverwaltung",
            Permissions = new[] { UserRead, UserCreate, UserUpdate, UserDelete, UserManage }
        },
        new PermissionGroup
        {
            Label = "Organisation – Kreise",
            Permissions = new[] { CircleRead, CircleCreate, CircleUpdate, CircleDelete }
        },
        new PermissionGroup
        {
            Label = "Organisation – Rollen",
            Permissions = new[] { RoleRead, RoleCreate, RoleUpdate, RoleAssign, RoleUnassign }
        },
        new PermissionGroup
        {
            Label = "Organisation – Meetings",
            Permissions = new[] { MeetingRead, MeetingCreate }
        },
        new PermissionGroup
        {
            Label = "Governance",
            Permissions = new[] { ProposalCreate, ObjectionCreate, ObjectionUpdate, DecisionCreate, DriverRead, DriverCreate, DriverUpdate }
        },
        new PermissionGroup
        {
            Label = "BI-Guide / BI-Kompass",
            Permissions = new[] { BiGuideRead, BiGuideManage }
        },
        new PermissionGroup
        {
            Label = "Support / FAQ",
            Permissions = new[] { TicketCreate, TicketRead, TicketUpdate, FaqRead, FaqManage }
        },
        new PermissionGroup
        {
            Label = "Kennzahlen & Ziele (KPI/OKR)",
            Permissions = new[] { KpiRead, KpiManage, KpiMeasure, OkrRead, OkrManage }
        },
        new PermissionGroup
        {
            Label = "Sonstiges",
            Permissions = new[] { StammdatenManage, DashboardRead, AppLogRead, DocsRead }
        }
    };
}

/// <summary>Gruppierung von Berechtigungen für die Berechtigungsverwaltung.</summary>
public class PermissionGroup
{
    public string Label { get; set; } = string.Empty;
    public string[] Permissions { get; set; } = Array.Empty<string>();
}
