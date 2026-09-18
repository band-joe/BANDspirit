// components/permission-guard.tsx
'use client';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
  permission:  string;
  fallback?:   React.ReactNode;
  children:    React.ReactNode;
}

/** Rendert Kinder nur wenn Permission vorhanden */
export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) return null;
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
