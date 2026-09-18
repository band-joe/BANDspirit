// lib/types.ts
// BANDspirit Domain-Typen (V1.0.2 — Frontend-Only, kein Prisma)

// ─────────────────────────────── Allgemein ────────────────────────────────────

export type DateRange = {
  from: Date | undefined;
  to:   Date | undefined;
};

// ─────────────────────────────── Benutzer ─────────────────────────────────────

export interface BandUser {
  Id:        string;
  Name:      string;
  Email:     string;
  Role:      string;
  Aktiv:     boolean;
  CreatedAt: string;
}

// ─────────────────────────────── Organisation / S3-Kreise ─────────────────────

export interface S3Circle {
  Id:                string;
  Name:              string;
  Beschreibung?:     string;
  ParentId?:         string;
  IsActive:          boolean;
  LifecyclePhase:    string;
  LastReviewDate?:   string;
  NextReviewDate?:   string;
  Children?:         S3Circle[];
  Roles?:            S3Role[];
  Drivers?:          S3Driver[];
}

export interface S3Role {
  Id:           string;
  Name:         string;
  Zweck?:       string;
  Verantwortung?: string;
  CircleId:     string;
  IsElected:    boolean;
  Assignments?: S3RoleAssignment[];
}

export interface S3RoleAssignment {
  Id:        string;
  RoleId:    string;
  UserId:    string;
  User?:     BandUser;
  StartDate: string;
  EndDate?:  string;
}

export interface S3Driver {
  Id:          string;
  Titel:       string;
  Beschreibung?: string;
  CircleId:    string;
  CreatedBy:   string;
  Status:      string;
  WorkItems?:  unknown[];
}

// ─────────────────────────────── Meetings ─────────────────────────────────────

export interface S3Meeting {
  Id:           string;
  Titel:        string;
  CircleId:     string;
  ScheduledAt:  string;
  Status:       string;
  AgendaItems?: MeetingAgendaItem[];
  Proposals?:   S3Proposal[];
}

export interface MeetingAgendaItem {
  Id:        string;
  MeetingId: string;
  Titel:     string;
  SortOrder: number;
}

// ─────────────────────────────── Governance ───────────────────────────────────

export interface S3Proposal {
  Id:          string;
  Titel:       string;
  CircleId:    string;
  Status:      string;
  Beschreibung?: string;
  Objections?: S3Objection[];
  Decision?:   S3Decision;
}

export interface S3Objection {
  Id:         string;
  ProposalId: string;
  UserId:     string;
  Grund:      string;
}

export interface S3Decision {
  Id:         string;
  ProposalId: string;
  Status:     string;
  EntschiedenAm: string;
}

// ─────────────────────────────── OKR ──────────────────────────────────────────

export interface OKR {
  Id:          string;
  Titel:       string;
  Beschreibung?: string;
  Fortschritt: number;
  Prioritaet?: number;
  CreatedAt:   string;
  KeyResults?: KeyResult[];
}

export interface KeyResult {
  Id:           string;
  OKRId:        string;
  Titel:        string;
  Startwert:    number;
  Zielwert:     number;
  IstWert:      number;
  Fortschritt:  number;
}

// ─────────────────────────────── KPI ──────────────────────────────────────────

export interface KpiDefinition {
  Id:            string;
  Name:          string;
  Beschreibung?: string;
  Einheit:       string;
  Zielwert?:     number;
  Measurements?: KpiMeasurement[];
}

export interface KpiMeasurement {
  Id:               string;
  KpiDefinitionId:  string;
  IstWert:          number;
  Messdatum:        string;
  Notiz?:           string;
}

// ─────────────────────────────── BI-Guide / BI-Kompass ────────────────────────

export interface BiGuideNews {
  Id:        string;
  Titel:     string;
  Inhalt:    string;
  CreatedAt: string;
  IsActive:  boolean;
}

export interface BiKompassVersion {
  Id:        string;
  Version:   string;
  Inhalt:    string;
  IsAktiv:   boolean;
  CreatedAt: string;
}

// ─────────────────────────────── Hilfe / Support ──────────────────────────────

export interface SupportTicket {
  Id:          string;
  Betreff:     string;
  Beschreibung?: string;
  Status:      string;
  Prioritaet?: string;
  CreatedBy:   string;
  CreatedAt:   string;
}

export interface FAQ {
  Id:        string;
  Frage:     string;
  Antwort:   string;
  IsActive:  boolean;
  SortOrder: number;
}

// ─────────────────────────────── Admin ────────────────────────────────────────

export interface Stammdaten {
  Id:        string;
  Kategorie: string;
  Code:      string;
  Wert:      string;
  SortOrder: number;
}

export interface Firma {
  Id:           string;
  Name:         string;
  Strasse?:     string;
  Plz?:         string;
  Ort?:         string;
  Land?:        string;
  LogoKey?:     string;
  WebsiteUrl?:  string;
}

export interface AppLog {
  Id:        string;
  Zeitstempel: string;
  Level:     string;
  Meldung:   string;
  UserId?:   string;
  Kontext?:  string;
  CreatedAt: string;
}

// ─────────────────────────────── Dashboard ────────────────────────────────────

/** Ein News-Eintrag aus dem BI-Guide, der auf dem Dashboard angezeigt wird */
export interface DashboardNewsItem {
  id:         string;
  titel:      string;
  inhalt:     string;
  kategorie?: string;
  createdAt:  string;
  createdBy?: { id: string; name: string };
}

/** Ein Kreis, der auf dem Dashboard als review-fällig markiert wird */
export interface DashboardCircleReview {
  id:             string;
  name:           string;
  lifecyclePhase: string;
  nextReviewDate?: string | null;
}

/** Statistiken für das Dashboard-Summary-Banner */
export interface DashboardStats {
  totalUsers:    number;
  activeUsers:   number;
  totalCircles:  number;
  activeCircles: number;
  totalDrivers:  number;
  offeneDrivers: number;
  totalTickets:  number;
  offeneTickets: number;
}

/** Vollständige Antwort des Dashboard-API-Endpunkts */
export interface DashboardApiResponse {
  stats:                DashboardStats;
  wichtigeNews:         DashboardNewsItem[];
  circlesNeedingReview: DashboardCircleReview[];
}

// ─────────────────────────────── Organisation (Listenansicht) ─────────────────

/** Kreis-Listenelement für die Organisations-Übersichtsseite */
export interface CircleListItem {
  id:                string;
  name:              string;
  verantwortlichkeit?: string | null;
  purpose?:          string | null;
  isActive:          boolean;
  parent?:           { id: string; name: string } | null;
  children:          { id: string; name: string }[];
  roles: {
    id:               string;
    name:             string;
    isCoordinator:    boolean;
    isRepresentative: boolean;
    isFacilitator:    boolean;
    assignments:      { user: { id: string; name: string } }[];
  }[];
  _count:   { roles: number; s3Meetings: number; drivers: number; decisions: number };
  creator:  { id: string; name: string };
  createdAt: string;
}

/** Spannungs-/Treiber-Listenelement für die Organisations-Übersichtsseite */
export interface DriverListItem {
  id:          string;
  title:       string;
  description: string | null;
  status:      string;
  priority:    string;
  circle:      { id: string; name: string };
  creator:     { id: string; name: string };
  createdAt:   string;
  workItems?:  { id: string; status: string }[];
}

/** Benutzer-Suche in der Organisation */
export interface OrgUser {
  id:    string;
  name:  string;
  email: string;
  aktiv: boolean;
}

/** Profil eines gefundenen Benutzers (nur lesend) inkl. Kreis-Zugehörigkeit */
export interface OrgUserProfile {
  name:          string;
  email:         string;
  portraetPfad:  string | null;
  kreise:        { name: string; leadLink: string | null }[];
}

// ─────────────────────────────── Permissions ──────────────────────────────────

export interface PermissionsResponse {
  permissions: string[];
  role:        string;
}
