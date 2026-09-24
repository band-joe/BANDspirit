// hooks/use-permissions.ts
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { hasPermission as hasStaticPermission, Permission } from '@/lib/rbac';

interface PermissionsResponse {
  permissions: string[];
  role:        string;
}

export function usePermissions() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<PermissionsResponse>({
    queryKey: queryKeys.permissions(),
    queryFn:  () => apiClient.get<PermissionsResponse>('/api/rollen/meine', session),
    enabled:  !!session,
    staleTime: 2 * 60 * 1000, // 2 Minuten Cache
  });

  const hasPermission = (permission: string): boolean =>
    data?.permissions.includes(permission) ?? false;

  const hasAnyPermission = (...permissions: string[]): boolean =>
    permissions.some((p) => hasPermission(p));

  const hasAllPermissions = (...permissions: string[]): boolean =>
    permissions.every((p) => hasPermission(p));

  // Massgebliche Prüfung für die UI: Sobald die DB-Berechtigungen geladen sind,
  // gelten ausschliesslich diese (damit greifen auch CircleAdmin, BiGuideAdmin,
  // Metriker und eigene Rollen). Solange sie laden oder leer sind, dient die
  // statische Zuordnung aus lib/rbac.ts als Fallback.
  const sessionRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const can = (permission: Permission): boolean => {
    if (sessionRole === 'Admin') return true;
    if (!isLoading && (data?.permissions.length ?? 0) > 0) {
      return data!.permissions.includes(permission);
    }
    return hasStaticPermission(sessionRole, permission);
  };

  return {
    permissions:      data?.permissions ?? [],
    role:             data?.role,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    // Kurzformen für häufig verwendete Permission-Gruppen
    canManageUsers:   hasPermission('user:manage'),
    canReadOrgCircle: hasPermission('org:circle:read'),
    canCreateCircle:  hasPermission('org:circle:create'),
    canReadBiGuide:   hasPermission('biguide:read'),
    canManageBiGuide: hasPermission('biguide:manage'),
    canReadBiKompass:   hasPermission('bikompass:read'),
    canManageBiKompass: hasPermission('bikompass:manage'),
    canReadAppLogs:   hasPermission('applog:read'),
    canManageStamm:   hasPermission('stammdaten:manage'),
    canCreateTicket:  hasPermission('ticket:create'),
  };
}
