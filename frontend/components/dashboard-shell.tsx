'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/rbac';
import { hasPermission, Permission } from '@/lib/rbac';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import {
  AccessKey,
  normalizeManagedRole,
  roleCanAccessKey,
  pathToAccessKey,
  ACCESS_REDIRECT_TARGET,
} from '@/lib/nav-access';
import {
  LayoutDashboard, UserCog, Settings, Building2,
  LogOut, Menu, ChevronDown, ChevronRight, ScrollText, BookOpen, ShieldCheck, Shield, Code, BookText, Cpu, GitBranch, Sparkles,
  CircleDot, Zap, Network, LifeBuoy, Ticket, HelpCircle, Newspaper, Search, Compass, Cloud, RefreshCw, Database, ClipboardList, Server, Target, ListChecks, Gauge, UserCircle, Mails, Tag, CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: Permission;
  /**
   * Zugriffsschlüssel für die rollenbasierte Menüsteuerung (V.2.0.7).
   * Für die verwalteten Rollen (Administrator/Mitglied/Lead-Link/BI-Guide)
   * ist dieser Schlüssel massgebend; für unbekannte Rollen greift `permission`.
   */
  accessKey?: AccessKey;
  children?: NavItem[];
}

/**
 * UI-02-Fix: `usePathname()` liefert nie einen Query-String, während einige
 * Ziel-Hrefs in `navItems` einen tragen (z. B. "/hilfe?tab=faq"). Ein simpler
 * `pathname === href`-Vergleich erkennt solche Ziele daher NIE als aktiv,
 * während ein Geschwister-Link ohne Query (z. B. "/hilfe" für "Tickets")
 * fälschlich aktiv bleibt, selbst wenn tatsächlich ein anderer Tab angezeigt
 * wird. Diese Funktion vergleicht Pfad UND die für die Navigation relevanten
 * Query-Parameter, und wird sowohl für Eltern- als auch Kind-Einträge sowie
 * für die Hilfe-Tab-Navigation selbst verwendet (siehe app/(dashboard)/hilfe).
 */
const TRACKED_QUERY_KEYS = ['tab'];

function parseHref(href: string): { pathname: string; params: URLSearchParams } {
  const [pathname, query = ''] = href.split('?');
  return { pathname, params: new URLSearchParams(query) };
}

function isNavItemActive(
  href: string,
  currentPathname: string | null | undefined,
  currentSearchParams: { get(key: string): string | null } | null | undefined
): boolean {
  const { pathname: hrefPathname, params: hrefParams } = parseHref(href);
  if (currentPathname === hrefPathname) {
    return TRACKED_QUERY_KEYS.every(
      (key) => (hrefParams.get(key) ?? '') === (currentSearchParams?.get(key) ?? '')
    );
  }
  return !!currentPathname?.startsWith(hrefPathname + '/');
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, accessKey: 'dashboard' },
  // MA-Profil: jeder angemeldete Benutzer sieht sein eigenes Profil (keine Berechtigung nötig).
  { label: 'MA-Profil', href: '/ma-profil', icon: <UserCircle className="h-5 w-5" />, accessKey: 'ma-profil' },
  // Mail-Verteiler: Verteilerlisten (Kreis-, Rollen- oder individuelle Variante),
  // für alle angemeldeten Benutzer sichtbar (keine spezielle Berechtigung nötig).
  { label: 'Mail-Verteiler', href: '/mail-verteiler', icon: <Mails className="h-5 w-5" />, accessKey: 'mail-verteiler' },
  { label: 'BI-Guide', href: '/organisation/bi-guide', icon: <Newspaper className="h-5 w-5" />, permission: 'biguide:read' as Permission, accessKey: 'bi-guide' },
  { label: 'BI-Kompass', href: '/organisation/bi-kompass', icon: <Compass className="h-5 w-5" />, permission: 'bikompass:read' as Permission, accessKey: 'bi-kompass' },
  { label: 'Organigramm', href: '/organisation/graph', icon: <Network className="h-5 w-5" />, permission: 'org:circle:read' as Permission, accessKey: 'organigramm' },
  { label: 'Life Cycle Prozess', href: '/organisation/bi-kompass/group-lifecycle', icon: <RefreshCw className="h-5 w-5" />, permission: 'org:circle:read' as Permission, accessKey: 'lifecycle' },
  // "Kreise" ist der Mutations-Einstieg (Kreise erfassen/bearbeiten) und darf nur
  // für Lead-Links und Administratoren sichtbar sein -> erfordert org:circle:create.
  // Das reine Organigramm (oben) bleibt mit org:circle:read für alle S3-Mitglieder sichtbar.
  { label: 'Kreise', href: '/organisation', icon: <CircleDot className="h-5 w-5" />, permission: 'org:circle:create' as Permission, accessKey: 'kreise' },
  { label: 'Spannungen', href: '/organisation?tab=drivers', icon: <Zap className="h-5 w-5" />, permission: 'org:driver:read' as Permission, accessKey: 'spannungen' },
  {
    label: 'Hilfe', href: '/hilfe?tab=suche', icon: <LifeBuoy className="h-5 w-5" />, permission: 'ticket:read' as Permission, accessKey: 'hilfe',
    children: [
      { label: 'Fachliche Dokumentation', href: '/dokumentation/fachlich', icon: <BookText className="h-4 w-4" />, permission: 'docs:read', accessKey: 'hilfe' },
      { label: 'Suche', href: '/hilfe?tab=suche', icon: <Search className="h-4 w-4" />, permission: 'ticket:read' as Permission, accessKey: 'hilfe' },
      { label: 'Tickets', href: '/hilfe', icon: <Ticket className="h-4 w-4" />, permission: 'ticket:read' as Permission, accessKey: 'hilfe' },
      { label: 'FAQ', href: '/hilfe?tab=faq', icon: <HelpCircle className="h-4 w-4" />, permission: 'faq:read' as Permission, accessKey: 'hilfe' },
    ],
  },
  {
    label: 'Dokumentation', href: '/dokumentation', icon: <BookOpen className="h-5 w-5" />, permission: 'docs:read', accessKey: 'dokumentation',
    children: [
      { label: 'Technische Dokumentation', href: '/dokumentation/technisch', icon: <Cpu className="h-4 w-4" />, permission: 'docs:read', accessKey: 'dokumentation' },
      { label: 'Context-Versionen', href: '/dokumentation/context-versionen', icon: <GitBranch className="h-4 w-4" />, permission: 'docs:read', accessKey: 'dokumentation' },
      { label: 'API Dokumentation', href: '/api-doku', icon: <Code className="h-4 w-4" />, accessKey: 'dokumentation' },
    ],
  },
  {
    label: 'Einstellungen', href: '/einstellungen', icon: <Settings className="h-5 w-5" />, accessKey: 'einstellungen',
    children: [
      { label: 'Firma', href: '/einstellungen/firma', icon: <Building2 className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'Benutzerverwaltung', href: '/benutzer', icon: <UserCog className="h-4 w-4" />, permission: 'user:read', accessKey: 'benutzerverwaltung' },
      { label: 'Benutzerrollen', href: '/einstellungen/benutzerrollen', icon: <UserCog className="h-4 w-4" />, permission: 'user:manage' },
      { label: 'Berechtigungen', href: '/einstellungen/berechtigungen', icon: <Shield className="h-4 w-4" />, permission: 'user:manage' },
      { label: 'S3-Rollen', href: '/einstellungen/s3-rollen', icon: <Shield className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'Lebenszyklus', href: '/einstellungen/lebenszyklus', icon: <RefreshCw className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'OKR', href: '/einstellungen/okr', icon: <Target className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'OKR-Zyklen', href: '/einstellungen/okr-zyklen', icon: <CalendarRange className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'Key Results', href: '/einstellungen/key-results', icon: <ListChecks className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'KPIs', href: '/einstellungen/kpi', icon: <Gauge className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'BI-Guide Kategorien', href: '/einstellungen/bi-guide-kategorien', icon: <Tag className="h-4 w-4" />, permission: 'stammdaten:manage' },
      { label: 'Application-Log', href: '/application-log', icon: <ScrollText className="h-4 w-4" />, permission: 'applog:read', accessKey: 'application-log' },
    ],
  },
];

export function DashboardShell({ children, user }: { children: React.ReactNode; user: { name?: string; email?: string; role?: string } }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const role = (user as any)?.role ?? '';
  
  // APP-03 (P005): Logout ruft Backend-Revoke auf, dann NextAuth signOut.
  const handleLogout = async () => {
    try {
      // Backend-Token widerrufen (POST /api/auth/logout)
      await apiClient.post('/api/auth/logout', {}, session);
    } catch (error) {
      // Bei Fehler trotzdem frontend-seitig ausloggen (fail-safe)
      console.error('Backend-Logout fehlgeschlagen:', error);
    } finally {
      // NextAuth-Session löschen
      await signOut({ callbackUrl: '/login' });
    }
  };

  // Rollenbasierte Menüsteuerung (V.2.0.7): Für die vier verwalteten Rollen
  // (Administrator/Mitglied/Lead-Link/BI-Guide) ist die Whitelist massgebend.
  // Für unbekannte/eigene Rollen bleibt die berechtigungsbasierte Filterung.
  const managedRole = normalizeManagedRole(role);

  // DB-gestützte Berechtigungen (z. B. Lead-Link mit org:circle:create).
  // Damit lassen sich Menüpunkte feiner steuern als über die statische Rolle.
  const { permissions: dbPermissions, isLoading: permsLoading } = usePermissions();

  // Kombinierte Prüfung: Admins sehen alles. Sobald die DB-Berechtigungen geladen
  // sind, sind diese massgebend (so sieht ein Lead-Link "Kreise", ein normales
  // S3-Mitglied dagegen nur das Organigramm). Solange sie noch laden oder leer
  // sind, wird auf die statische Rollenzuordnung zurückgegriffen.
  const can = (permission?: Permission): boolean => {
    if (!permission) return true;
    if (role === 'Admin') return true;
    if (!permsLoading && dbPermissions.length > 0) {
      return dbPermissions.includes(permission);
    }
    return hasPermission(role, permission);
  };

  // Zentrale Sichtbarkeitsprüfung pro Menüpunkt.
  // - Verwaltete Rolle -> Whitelist über accessKey ist massgebend.
  // - Sonst            -> bestehende Berechtigungsprüfung (can()).
  const canSeeItem = (item: NavItem): boolean => {
    if (managedRole) {
      if (!item.accessKey) return false;
      return roleCanAccessKey(managedRole, item.accessKey);
    }
    return can(item.permission);
  };

  // Route-Guard (V.2.0.7): Verwaltete Rollen, die eine nicht erlaubte Seite
  // direkt aufrufen, werden auf das Dashboard umgeleitet.
  useEffect(() => {
    if (!managedRole) return;
    const tab = searchParams?.get('tab');
    const key = pathToAccessKey(pathname ?? '', tab);
    if (key && !roleCanAccessKey(managedRole, key)) {
      router.replace(ACCESS_REDIRECT_TARGET);
    }
  }, [managedRole, pathname, searchParams, router]);

  // UI-04-Fix: Mobiles Menü nach jeder Navigation (Link-Klick oder
  // programmatischer Routenwechsel) automatisch schliessen, statt geöffnet
  // stehen zu bleiben ("close-on-navigation" aus dem Drawer-Interaktionsmodell).
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, searchParams]);

  // Auto-expand parent if a child is active
  const isChildActive = (item: NavItem) =>
    item.children?.some(c => isNavItemActive(c.href, pathname, searchParams));

  const filteredNavItems = navItems?.filter?.((item: NavItem) => {
    if (managedRole) {
      // Für verwaltete Rollen zählt allein der accessKey des Eltern-Eintrags.
      return canSeeItem(item);
    }
    if (item.children) {
      return item.children.some(c => can(c.permission));
    }
    return can(item.permission);
  }) ?? [];

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // UI-04-Fix: Der Navigationsinhalt selbst ist für Desktop (immer sichtbare
  // statische Spalte) und Mobile (Drawer) identisch - nur die umgebende
  // Hülle unterscheidet sich. Als Funktion extrahiert, damit beide Stellen
  // exakt dieselbe Struktur/Logik verwenden, statt sie zu duplizieren.
  const renderSidebarNav = () => (
    <>
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">BA</span>
          </div>
          <span className="font-display font-bold text-lg">BANDspirit</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredNavItems.map((item) => {
          if (item.children) {
            const isOpen = expandedGroups[item.label] ?? isChildActive(item);
            // UI-18-Fix: Bei verwalteten Rollen war der eigene accessKey eines
            // Kind-Eintrags bislang vollständig wirkungslos - sobald der
            // Eltern-Eintrag sichtbar war, wurden ausnahmslos ALLE Unterpunkte
            // angezeigt. Ein Kind ohne eigenen accessKey verhält sich weiterhin
            // wie zuvor (an den Eltern-Eintrag gekoppelt); ein Kind MIT eigenem
            // accessKey (z. B. Application-Log) wird jetzt zusätzlich gegen die
            // Rollen-Whitelist geprüft, statt den Schlüssel stillschweigend zu
            // ignorieren. Für die aktuell definierten Rollen ändert sich dadurch
            // nichts (nur Admin erreicht "Einstellungen" überhaupt), macht den
            // Schlüssel aber für künftige, feiner abgestufte Freigaben wirksam.
            const visibleChildren = managedRole
              ? item.children.filter(c => !c.accessKey || roleCanAccessKey(managedRole, c.accessKey))
              : item.children.filter(c => can(c.permission));
            return (
              <div key={item.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(item.label)}
                  aria-expanded={isOpen}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-white hover:bg-white/10',
                    isChildActive(item) && 'bg-white/10'
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {visibleChildren.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-white hover:bg-white/10',
                          isNavItemActive(child.href, pathname, searchParams) && 'bg-white/10 font-medium'
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-1 text-white hover:bg-white/10',
                isNavItemActive(item.href, pathname, searchParams) && 'bg-white/10'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="text-sm text-white mb-1">{user?.name || 'Benutzer'}</div>
        <div className="text-xs text-white mb-2">{getRoleLabel(user?.role ?? '')}</div>
        <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop-Sidebar: immer sichtbare statische Spalte ab lg-Breakpoint.
          UI-05-Fix: #2a6b64 (dunklere Variante des Marken-Teals, im Rest der
          App bereits als Hover-Farbe verwendet) statt #3e8f88 als Hintergrund
          - Weiss auf #3e8f88 erreicht nur ~3.83:1, auf #2a6b64 ~6.2:1 (AA
          4.5:1 für normalen Text). Alle Sidebar-Texte sind daher jetzt
          voll deckend (text-white) statt mit reduzierter Deckkraft (die
          zuvor u. a. bei /70 und /50 den Kontrast weiter unter 4.5:1 drückte).
          Der Aktiv-Hintergrund ist von bg-white/15 auf bg-white/10 reduziert,
          da /15 den Effektivhintergrund wieder in Richtung des alten,
          nicht-konformen Tons aufhellte (~4.44:1 statt ~4.96:1 bei /10). */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#2a6b64] text-white">
        {renderSidebarNav()}
      </aside>

      {/* UI-04-Fix: Mobiles Menü als Radix-Dialog-basierter Sheet-Drawer statt
          einer per CSS-Transform verschobenen <aside>. Das behebt alle vier
          im Finding genannten Lücken auf einmal, weil Radix Dialog sie bereits
          eingebaut mitbringt: Content wird bei geschlossenem Zustand komplett
          aus dem DOM entfernt (keine tabbaren Off-Screen-Elemente), Fokus wird
          beim Öffnen in den Drawer und beim Schliessen zurück zum auslösenden
          Button verschoben (Fokus-Zyklus/-Restauration), Escape schliesst den
          Dialog, und der Hintergrund wird über das automatische Overlay von
          Interaktion isoliert. "close-on-navigation" wird oben separat per
          useEffect auf [pathname, searchParams] sichergestellt. */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          id="mobile-sidebar"
          side="left"
          className="w-64 max-w-[85vw] bg-[#2a6b64] text-white border-none p-0 flex flex-col lg:hidden"
        >
          <SheetTitle className="sr-only">Navigationsmenü</SheetTitle>
          <SheetDescription className="sr-only">Hauptnavigation von BANDspirit</SheetDescription>
          {renderSidebarNav()}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <header className="h-16 border-b bg-card flex items-center px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Navigationsmenü öffnen"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </header>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
