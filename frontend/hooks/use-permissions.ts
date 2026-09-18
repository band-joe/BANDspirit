// hooks/use-permissions.ts
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

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

  return {
    permissions:      data?.permissions ?? [],
    role:             data?.role,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Kurzformen für häufig verwendete Permission-Gruppen
    canManageUsers:   hasPermission('user:manage'),
    canReadOrgCircle: hasPermission('org:circle:read'),
    canCreateCircle:  hasPermission('org:circle:create'),
    canReadBiGuide:   hasPermission('biguide:read'),
    canManageBiGuide: hasPermission('biguide:manage'),
    canReadAppLogs:   hasPermission('applog:read'),
    canManageStamm:   hasPermission('stammdaten:manage'),
    canCreateTicket:  hasPermission('ticket:create'),
  };
}
