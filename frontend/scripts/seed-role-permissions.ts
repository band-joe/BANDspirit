import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rolePermissions: Record<string, string[]> = {
  ADMIN: [
    'klient:create', 'klient:read', 'klient:update', 'klient:delete',
    'intake:create', 'intake:read', 'intake:update',
    'einsatz:create', 'einsatz:read', 'einsatz:update',
    'arbeitsplatz:create', 'arbeitsplatz:read', 'arbeitsplatz:update',
    'berufsbild:create', 'berufsbild:read', 'berufsbild:update',
    'bericht:create', 'bericht:read', 'bericht:update', 'bericht_template:manage', 'berichtsart:manage',
    'abrechnung:create', 'abrechnung:read', 'abrechnung:pruefen', 'abrechnung:genehmigen', 'abrechnung:exportieren',
    'leistung:manage',
    'kontakt:create', 'kontakt:read', 'kontakt:update',
    'user:read', 'user:create', 'user:update', 'user:delete', 'user:manage',
    'meeting:read', 'meeting:create', 'meeting:update', 'meeting_typ:manage',
    'meeting_planer:read', 'meeting_planer:create', 'meeting_planer:update',
    'workflow:read', 'workflow:create', 'workflow:update',
    'target:create', 'target:read', 'target:update',
    'service:create', 'service:read', 'service:update',
    'product:create', 'product:read', 'product:update',
    'actionplan:create', 'actionplan:read', 'actionplan:update',
    'org:circle:read', 'org:circle:create', 'org:circle:update', 'org:circle:delete',
    'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
    'org:meeting:read', 'org:meeting:create',
    'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
    'org:driver:read', 'org:driver:create', 'org:driver:update',
    'stammdaten:manage',
    'dashboard:read',
    'applog:read',
    'docs:read',
    'ticket:create', 'ticket:read', 'ticket:update',
    'faq:read', 'faq:manage',
  ],
  TEAMLEITUNG: [
    'klient:create', 'klient:read', 'klient:update',
    'intake:create', 'intake:read', 'intake:update',
    'einsatz:create', 'einsatz:read', 'einsatz:update',
    'arbeitsplatz:create', 'arbeitsplatz:read', 'arbeitsplatz:update',
    'berufsbild:read', 'berufsbild:update',
    'bericht:read', 'bericht:update',
    'abrechnung:read', 'abrechnung:genehmigen',
    'kontakt:create', 'kontakt:read', 'kontakt:update',
    'meeting:read', 'meeting:create', 'meeting:update',
    'meeting_planer:read', 'meeting_planer:create', 'meeting_planer:update',
    'workflow:read', 'workflow:create', 'workflow:update',
    'target:create', 'target:read', 'target:update',
    'service:create', 'service:read', 'service:update',
    'product:create', 'product:read', 'product:update',
    'actionplan:create', 'actionplan:read', 'actionplan:update',
    'org:circle:read', 'org:circle:create', 'org:circle:update',
    'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
    'org:meeting:read', 'org:meeting:create',
    'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
    'org:driver:read', 'org:driver:create', 'org:driver:update',
    'stammdaten:manage',
    'user:read',
    'dashboard:read',
    'applog:read',
    'docs:read',
    'ticket:create', 'ticket:read', 'ticket:update',
    'faq:read', 'faq:manage',
  ],
  FALLMANAGER: [
    'klient:create', 'klient:read', 'klient:update',
    'intake:create', 'intake:read', 'intake:update',
    'einsatz:read',
    'arbeitsplatz:read',
    'berufsbild:read',
    'bericht:create', 'bericht:read', 'bericht:update',
    'abrechnung:create', 'abrechnung:read',
    'kontakt:create', 'kontakt:read', 'kontakt:update',
    'meeting:read', 'meeting:create', 'meeting:update',
    'meeting_planer:read', 'meeting_planer:create', 'meeting_planer:update',
    'workflow:read', 'workflow:create', 'workflow:update',
    'target:create', 'target:read', 'target:update',
    'service:create', 'service:read', 'service:update',
    'product:create', 'product:read', 'product:update',
    'actionplan:create', 'actionplan:read', 'actionplan:update',
    'org:circle:read', 'org:circle:create', 'org:circle:update',
    'org:role:read', 'org:role:create', 'org:role:update', 'org:role:assign', 'org:role:unassign',
    'org:meeting:read', 'org:meeting:create',
    'org:proposal:create', 'org:objection:create', 'org:objection:update', 'org:decision:create',
    'org:driver:read', 'org:driver:create', 'org:driver:update',
    'dashboard:read',
    'docs:read',
    'ticket:create', 'ticket:read',
    'faq:read',
  ],
  EINSATZPLANER: [
    'klient:read',
    'intake:read',
    'einsatz:create', 'einsatz:read', 'einsatz:update',
    'arbeitsplatz:create', 'arbeitsplatz:read', 'arbeitsplatz:update',
    'berufsbild:create', 'berufsbild:read', 'berufsbild:update',
    'bericht:read',
    'abrechnung:read',
    'kontakt:read',
    'meeting:read',
    'meeting_planer:read',
    'workflow:read',
    'target:read',
    'service:read',
    'product:read',
    'actionplan:read',
    'org:circle:read',
    'org:role:read',
    'org:meeting:read',
    'org:driver:read',
    'dashboard:read',
    'docs:read',
    'ticket:create', 'ticket:read',
    'faq:read',
  ],
};

async function main() {
  // Check if already seeded
  const existing = await prisma.rolePermission.count();
  if (existing > 0) {
    console.log(`RolePermission already has ${existing} entries. Skipping seed.`);
    return;
  }

  let count = 0;
  for (const [role, permissions] of Object.entries(rolePermissions)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role: role as any, permission } },
        update: {},
        create: { role: role as any, permission },
      });
      count++;
    }
  }

  console.log(`Seeded ${count} RolePermission entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
