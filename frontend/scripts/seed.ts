import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Users
  const users = [
    { id: 'user-admin', name: 'Admin', email: 'john@doe.com', password: hash('johndoe123'), role: 'ADMIN' as const },
    { id: 'user-admin2', name: 'Anna Admin', email: 'admin@klientenmanagement.de', password: hash('Test123!'), role: 'ADMIN' as const },
    { id: 'user-fm', name: 'Sabine Schmidt', email: 'fallmanager@klientenmanagement.de', password: hash('Test123!'), role: 'FALLMANAGER' as const },
    { id: 'user-ep', name: 'Peter Planer', email: 'planer@klientenmanagement.de', password: hash('Test123!'), role: 'EINSATZPLANER' as const },
    { id: 'user-tl', name: 'Klaus Teamleiter', email: 'team@klientenmanagement.de', password: hash('Test123!'), role: 'TEAMLEITUNG' as const },
    { id: 'user-ej', name: 'Erich Jost', email: 'erich.jost@band.ch', password: hash('Test-1234!'), role: 'ADMIN' as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: u,
    });
  }

  // --- Stammdaten (relevante Kategorien für verbleibende Module) ---
  const stammdatenData = [
    // GESCHLECHT (allgemein nutzbar)
    { kategorie: 'GESCHLECHT', code: 'MAENNLICH', bezeichnung: 'Männlich', sortierung: 1, aktiv: true },
    { kategorie: 'GESCHLECHT', code: 'WEIBLICH', bezeichnung: 'Weiblich', sortierung: 2, aktiv: true },
    { kategorie: 'GESCHLECHT', code: 'DIVERS', bezeichnung: 'Divers', sortierung: 3, aktiv: true },
    // BRANCHE (für Organisationskreise)
    { kategorie: 'BRANCHE', code: 'GASTRONOMIE', bezeichnung: 'Gastronomie', sortierung: 1, aktiv: true, farbe: '#E65100' },
    { kategorie: 'BRANCHE', code: 'HANDWERK', bezeichnung: 'Handwerk', sortierung: 2, aktiv: true, farbe: '#1B5E20' },
    { kategorie: 'BRANCHE', code: 'BUERO', bezeichnung: 'Büro / Verwaltung', sortierung: 3, aktiv: true, farbe: '#0D47A1' },
    { kategorie: 'BRANCHE', code: 'LOGISTIK', bezeichnung: 'Logistik', sortierung: 4, aktiv: true, farbe: '#4A148C' },
    { kategorie: 'BRANCHE', code: 'REINIGUNG', bezeichnung: 'Reinigung', sortierung: 5, aktiv: true, farbe: '#00695C' },
    { kategorie: 'BRANCHE', code: 'DETAILHANDEL', bezeichnung: 'Detailhandel', sortierung: 6, aktiv: true, farbe: '#BF360C' },
    { kategorie: 'BRANCHE', code: 'GESUNDHEIT', bezeichnung: 'Gesundheit / Pflege', sortierung: 7, aktiv: true, farbe: '#AD1457' },
    { kategorie: 'BRANCHE', code: 'SONSTIGES', bezeichnung: 'Sonstiges', sortierung: 8, aktiv: true, farbe: '#546E7A' },
  ];

  for (const sd of stammdatenData) {
    await prisma.stammdaten.upsert({
      where: { kategorie_code: { kategorie: sd.kategorie, code: sd.code } },
      update: { bezeichnung: sd.bezeichnung, sortierung: sd.sortierung, farbe: sd.farbe ?? null },
      create: sd,
    });
  }
  console.log('Stammdaten seeded.');

  // RolePermission-Daten (reduzierter Scope)
  const rolePermissionsData: Record<string, string[]> = {
    ADMIN: [
      'user:read', 'user:create', 'user:update', 'user:delete', 'user:manage',
      'org:circle:read', 'org:circle:create', 'org:circle:update', 'org:circle:delete',
      'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
      'org:meeting:read', 'org:meeting:create',
      'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
      'org:driver:read', 'org:driver:create', 'org:driver:update',
      'stammdaten:manage', 'dashboard:read', 'applog:read', 'docs:read',
      'ticket:create', 'ticket:read', 'ticket:update',
      'faq:read', 'faq:manage',
      'biguide:read', 'biguide:manage',
    ],
    TEAMLEITUNG: [
      'org:circle:read', 'org:circle:create', 'org:circle:update',
      'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
      'org:meeting:read', 'org:meeting:create',
      'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
      'org:driver:read', 'org:driver:create', 'org:driver:update',
      'stammdaten:manage', 'user:read', 'dashboard:read', 'applog:read', 'docs:read',
      'ticket:create', 'ticket:read', 'ticket:update',
      'faq:read', 'faq:manage',
      'biguide:read', 'biguide:manage',
    ],
    FALLMANAGER: [
      'org:circle:read', 'org:circle:create', 'org:circle:update',
      'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
      'org:meeting:read', 'org:meeting:create',
      'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
      'org:driver:read', 'org:driver:create', 'org:driver:update',
      'dashboard:read', 'docs:read',
      'ticket:create', 'ticket:read',
      'faq:read',
      'biguide:read',
    ],
    EINSATZPLANER: [
      'org:circle:read', 'org:role:read', 'org:meeting:read', 'org:driver:read',
      'dashboard:read', 'docs:read',
      'ticket:create', 'ticket:read',
      'faq:read',
      'biguide:read',
    ],
  };

  let addedPerms = 0;
  for (const [role, permissions] of Object.entries(rolePermissionsData)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role: role as any, permission } },
        update: {},
        create: { role: role as any, permission },
      });
      addedPerms++;
    }
  }
  console.log(`RolePermission upsert: ${addedPerms} Einträge verarbeitet.`);

  // BI-Kompass V1.0 Seed
  const existingKompass = await prisma.bIKompassVersion.count();
  if (existingKompass === 0) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      await prisma.bIKompassVersion.create({
        data: {
          version: 'V1.0',
          titel: 'BI-Kompass der Zusammenarbeit',
          inhalt: 'Bitte laden Sie den BI-Kompass V1.0 Inhalt über die Bearbeitungsfunktion hoch.',
          aenderungen: 'Erste Version',
          gueltigAb: new Date('2025-10-01'),
          isAktiv: true,
          createdById: adminUser.id,
        },
      });
      console.log('BI-Kompass V1.0 placeholder seeded.');
    }
  } else {
    console.log(`BI-Kompass already has ${existingKompass} entries. Skipping.`);
  }

  // S3RollenDefinition — Vordefinierte Rollentypen für Organisation
  const s3RollenDefs = [
    { name: 'Lead Link', beschreibung: 'Vertritt den übergeordneten Kreis und trägt die Gesamtverantwortung für den Kreis.', isLeadLink: true, sortOrder: 0 },
    { name: 'Facilitator', beschreibung: 'Moderiert die Meetings und sorgt für die Einhaltung des Prozesses.', isLeadLink: false, sortOrder: 1 },
    { name: 'Delegierter', beschreibung: 'Vertritt den Kreis im übergeordneten Kreis (Repräsentant).', isLeadLink: false, sortOrder: 2 },
    { name: 'Koordinator', beschreibung: 'Koordiniert die operative Arbeit innerhalb des Kreises.', isLeadLink: false, sortOrder: 3 },
    { name: 'Sekretär', beschreibung: 'Protokolliert Meetings und verwaltet die Dokumentation des Kreises.', isLeadLink: false, sortOrder: 4 },
  ];

  for (const def of s3RollenDefs) {
    await prisma.s3RollenDefinition.upsert({
      where: { name: def.name },
      update: { beschreibung: def.beschreibung, isLeadLink: def.isLeadLink, sortOrder: def.sortOrder },
      create: def,
    });
  }
  console.log('S3RollenDefinition seeded.');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
