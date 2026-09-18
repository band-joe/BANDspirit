// lib/rbac.ts
// Rollen- und Berechtigungsdefinitionen (RBAC) für das Frontend.
// Dient als synchroner Fallback für die UI-Filterung. Die massgebliche
// Berechtigungsprüfung erfolgt serverseitig im C#-Backend; zusätzlich kann
// der Hook `usePermissions()` die tatsächlichen DB-Berechtigungen laden.

/** Verfügbare Benutzerrollen im System */
export type UserRole = 'Admin' | 'User';

/** Alle im System bekannten Berechtigungen (Permission-Strings) */
export type Permission =
  | 'user:read' | 'user:create' | 'user:update' | 'user:delete' | 'user:manage'
  | 'org:circle:read' | 'org:circle:create' | 'org:circle:update' | 'org:circle:delete'
  | 'org:role:read' | 'org:role:create' | 'org:role:update' | 'org:role:assign' | 'org:role:unassign'
  | 'org:meeting:read' | 'org:meeting:create'
  | 'org:proposal:create' | 'org:objection:create' | 'org:objection:update'
  | 'org:decision:create' | 'org:driver:read' | 'org:driver:create' | 'org:driver:update'
  | 'biguide:read' | 'biguide:manage'
  | 'ticket:create' | 'ticket:read' | 'ticket:update'
  | 'faq:read' | 'faq:manage'
  | 'kpi:read' | 'kpi:manage' | 'kpi:measure'
  | 'okr:read' | 'okr:manage'
  | 'stammdaten:manage' | 'dashboard:read' | 'applog:read' | 'docs:read';

/** Vollständige Liste aller Berechtigungen (für die Admin-Rolle) */
const ALL_PERMISSIONS: Permission[] = [
  'user:read', 'user:create', 'user:update', 'user:delete', 'user:manage',
  'org:circle:read', 'org:circle:create', 'org:circle:update', 'org:circle:delete',
  'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
  'org:meeting:read', 'org:meeting:create',
  'org:proposal:create', 'org:objection:create', 'org:objection:update',
  'org:decision:create', 'org:driver:read', 'org:driver:create', 'org:driver:update',
  'biguide:read', 'biguide:manage',
  'ticket:create', 'ticket:read', 'ticket:update',
  'faq:read', 'faq:manage',
  'kpi:read', 'kpi:manage', 'kpi:measure',
  'okr:read', 'okr:manage',
  'stammdaten:manage', 'dashboard:read', 'applog:read', 'docs:read',
];

/**
 * Standardberechtigungen pro Rolle.
 * Wird als Fallback verwendet, wenn die DB-gestützten Berechtigungen
 * (über `usePermissions()`) nicht verfügbar sind.
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: ALL_PERMISSIONS,
  User: [
    'dashboard:read',
    'org:circle:read', 'org:role:read', 'org:meeting:read',
    'org:driver:read',
    'biguide:read',
    'ticket:create',
    'faq:read', 'docs:read',
  ],
};

/**
 * Prüft, ob eine Rolle eine bestimmte Berechtigung besitzt.
 * Admins besitzen immer alle Berechtigungen.
 */
export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (role === 'Admin') return true;
  return (DEFAULT_PERMISSIONS[role as UserRole] ?? []).includes(permission);
}

/**
 * Deutschsprachige Labels für alle Permission-Strings.
 * Wird in der Rollenverwaltung für die UI-Darstellung verwendet.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'user:read':             'Benutzer anzeigen',
  'user:create':           'Benutzer erstellen',
  'user:update':           'Benutzer bearbeiten',
  'user:delete':           'Benutzer löschen',
  'user:manage':           'Benutzerverwaltung',
  'org:circle:read':       'Circles anzeigen',
  'org:circle:create':     'Circles erstellen',
  'org:circle:update':     'Circles bearbeiten',
  'org:circle:delete':     'Circles löschen',
  'org:role:read':         'Rollen anzeigen',
  'org:role:create':       'Rollen erstellen',
  'org:role:update':       'Rollen bearbeiten',
  'org:role:assign':       'Rollen zuweisen',
  'org:role:unassign':     'Rollenzuweisung aufheben',
  'org:meeting:read':      'Meetings anzeigen',
  'org:meeting:create':    'Meetings erstellen',
  'org:proposal:create':   'Proposals erstellen',
  'org:objection:create':  'Einwände erstellen',
  'org:objection:update':  'Einwände bearbeiten',
  'org:decision:create':   'Entscheidungen erfassen',
  'org:driver:read':       'Treiber anzeigen',
  'org:driver:create':     'Treiber erstellen',
  'org:driver:update':     'Treiber bearbeiten',
  'biguide:read':          'BI-Guide anzeigen',
  'biguide:manage':        'BI-Guide verwalten',
  'ticket:create':         'Support-Ticket erstellen',
  'ticket:read':           'Support-Tickets anzeigen',
  'ticket:update':         'Support-Tickets bearbeiten',
  'faq:read':              'FAQ anzeigen',
  'faq:manage':            'FAQ verwalten',
  'kpi:read':              'KPIs anzeigen',
  'kpi:manage':            'KPIs verwalten',
  'kpi:measure':           'KPI-Messwerte erfassen',
  'okr:read':              'OKRs anzeigen',
  'okr:manage':            'OKRs verwalten',
  'stammdaten:manage':     'Stammdaten verwalten',
  'dashboard:read':        'Dashboard anzeigen',
  'applog:read':           'App-Protokoll anzeigen',
  'docs:read':             'Dokumentation anzeigen',
};

/** Gibt das deutschsprachige Label einer Rolle zurück */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    Admin: 'Administrator',
    User: 'Benutzer',
    Mitglied: 'Mitglied',
    'Lead-Link': 'Lead-Link',
    LeadLink: 'Lead-Link',
    'BI-Guide': 'BI-Guide',
    BIGuide: 'BI-Guide',
  };
  return labels[role] ?? role;
}
