// hooks/use-odata-mutation.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';

interface MutationConfig<TData, TVariables> extends
  Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  invalidateKeys?: readonly unknown[][];
}

/** POST /odata/{entitySet} oder /api/{path} */
export function useCreate<TData, TVariables>(
  path: string,
  config?: MutationConfig<TData, TVariables>
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { invalidateKeys = [], ...rest } = config ?? {};

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => apiClient.post<TData>(path, variables, session),
    onSuccess:  (data, variables, ctx) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      rest.onSuccess?.(data, variables, ctx);
    },
    ...rest,
  });
}

/** PATCH /odata/{entitySet}({id}) */
export function useUpdate<TData, TVariables extends { id: string }>(
  entitySet: string,
  config?: MutationConfig<TData, TVariables>
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { invalidateKeys = [], ...rest } = config ?? {};

  return useMutation<TData, Error, TVariables>({
    mutationFn: ({ id, ...body }) =>
      apiClient.patch<TData>(`/odata/${entitySet}(${id})`, body, session),
    onSuccess:  (data, variables, ctx) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      rest.onSuccess?.(data, variables, ctx);
    },
    ...rest,
  });
}

/** DELETE /odata/{entitySet}({id}) */
export function useDelete(
  entitySet: string,
  config?: MutationConfig<void, string>
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { invalidateKeys = [], ...rest } = config ?? {};

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/odata/${entitySet}(${id})`, session),
    onSuccess:  (data, variables, ctx) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      rest.onSuccess?.(data, variables, ctx);
    },
    ...rest,
  });
}

/** OData Action (POST /odata/{entitySet}({id})/{ActionName}) */
export function useODataAction<TData, TVariables>(
  entitySet: string,
  actionName: string,
  config?: MutationConfig<TData, TVariables & { id: string }>
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { invalidateKeys = [], ...rest } = config ?? {};

  return useMutation<TData, Error, TVariables & { id: string }>({
    mutationFn: ({ id, ...body }) =>
      apiClient.post<TData>(`/odata/${entitySet}(${id})/${actionName}`, body, session),
    onSuccess:  (data, variables, ctx) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      rest.onSuccess?.(data, variables, ctx);
    },
    ...rest,
  });
}
