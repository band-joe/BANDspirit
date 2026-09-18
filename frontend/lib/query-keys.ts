// lib/query-keys.ts
// Zentrale, typsichere React Query Key Factory

export const queryKeys = {
  // Dashboard
  dashboard:      () => ['dashboard'] as const,

  // Circles / Org
  circles:        () => ['circles'] as const,
  circlesList:    (filter?: string) => [...queryKeys.circles(), 'list', filter] as const,
  circleDetail:   (id: string) => [...queryKeys.circles(), 'detail', id] as const,
  circleRoles:    (circleId: string) => [...queryKeys.circles(), circleId, 'roles'] as const,
  circleMeetings: (circleId: string) => [...queryKeys.circles(), circleId, 'meetings'] as const,
  circleDrivers:  (circleId: string) => [...queryKeys.circles(), circleId, 'drivers'] as const,
  orgGraph:       () => ['org', 'graph'] as const,

  // Meetings
  meetings:       () => ['meetings'] as const,
  meetingDetail:  (id: string) => [...queryKeys.meetings(), 'detail', id] as const,

  // Proposals
  proposals:      () => ['proposals'] as const,
  proposalDetail: (id: string) => [...queryKeys.proposals(), 'detail', id] as const,

  // Drivers
  drivers:        () => ['drivers'] as const,

  // OKR
  okrs:           () => ['okrs'] as const,
  okrDetail:      (id: string) => [...queryKeys.okrs(), 'detail', id] as const,

  // KPI
  kpiDefs:        () => ['kpi-definitions'] as const,
  kpiDetail:      (id: string) => [...queryKeys.kpiDefs(), 'detail', id] as const,

  // BI
  biNews:         () => ['bi-guide-news'] as const,
  biKompass:      () => ['bi-kompass'] as const,

  // Hilfe
  tickets:        () => ['support-tickets'] as const,
  ticketDetail:   (id: string) => [...queryKeys.tickets(), 'detail', id] as const,
  faq:            () => ['faq'] as const,

  // Admin
  users:          () => ['users'] as const,
  userDetail:     (id: string) => [...queryKeys.users(), 'detail', id] as const,
  stammdaten:     (kategorie?: string) => ['stammdaten', kategorie ?? 'all'] as const,
  firma:          () => ['firma'] as const,
  appLogs:        (filter?: string) => ['app-logs', filter ?? 'all'] as const,

  // Permissions
  permissions:    () => ['permissions'] as const,
};
