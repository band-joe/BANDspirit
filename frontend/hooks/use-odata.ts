// hooks/use-odata.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { ODataQuery, ODataResponse } from '@/lib/odata';

/**
 * Generischer Hook für OData Collection-Abfragen.
 * @param entitySet  OData EntitySet-Name (z.B. "Circles")
 * @param queryKey   React Query Key Array
 * @param query      ODataQuery-Instanz oder fertiger URL-String
 * @param options    Zusätzliche React Query Optionen
 */
export function useOData<T>(
  entitySet: string,
  queryKey: readonly unknown[],
  query?: ODataQuery | string,
  options?: Omit<UseQueryOptions<ODataResponse<T>>, 'queryKey' | 'queryFn'>
) {
  const { data: session } = useSession();

  const url = typeof query === 'string'
    ? query
    : query
      ? query.build(entitySet)
      : `/odata/${entitySet}`;

  return useQuery<ODataResponse<T>>({
    queryKey: [...queryKey, url],
    queryFn:  () => apiClient.get<ODataResponse<T>>(url, session),
    enabled:  !!session,
    staleTime: 30_000, // 30 Sekunden
    ...options,
  });
}

/**
 * Hook für OData Einzelobjekt-Abfragen (kein value-Wrapper).
 * @param url    Vollständiger OData-Pfad inkl. ID und $expand
 * @param queryKey
 */
export function useODataSingle<T>(
  url: string,
  queryKey: readonly unknown[],
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { data: session } = useSession();
  return useQuery<T>({
    queryKey: [...queryKey, url],
    queryFn:  () => apiClient.get<T>(url, session),
    enabled:  !!session,
    staleTime: 30_000,
    ...options,
  });
}
