/* ------------------------------------------------------------------ */
/*  Gemeinsame Typen für /api/org/graph                                */
/*  (genutzt von der Baumansicht in ../page.tsx und der Kreisansicht)  */
/* ------------------------------------------------------------------ */

export interface RoleAssignment {
  user: { id: string; name: string | null; email?: string | null; telefon?: string | null };
}

export interface GraphRole {
  id: string;
  name: string;
  /** Zweck der Rolle (aus der Rollendefinition). */
  purpose?: string | null;
  /** Domäne/Bereich der Rolle (aus der Rollendefinition). */
  domain?: string | null;
  /** Verantwortlichkeiten der Rolle (aus der Rollendefinition). */
  accountabilities?: string | null;
  /** Beschreibung der Rolle (aus der Rollendefinition). */
  description?: string | null;
  isCoordinator: boolean;
  isRepresentative: boolean;
  isFacilitator: boolean;
  isLeadLink?: boolean;
  assignments: RoleAssignment[];
}

export interface GraphCircle {
  id: string;
  name: string;
  purpose: string | null;
  /** Verantwortlichkeiten des Kreises (der Kreis hat keine separate Domäne). */
  accountabilities?: string | null;
  parentId: string | null;
  roles: GraphRole[];
}

export interface TreeNode {
  circle: GraphCircle;
  children: TreeNode[];
  depth: number;
}
