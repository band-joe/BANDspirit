// hooks/use-stammdaten.ts
import { useOData } from './use-odata';
import { odataQueries } from '@/lib/odata';
import { queryKeys } from '@/lib/query-keys';

interface Stammdaten {
  Id:        string;
  Kategorie: string;
  Code:      string;
  Wert:      string;
  SortOrder: number;
}

/** Lädt alle Stammdaten einer Kategorie (z.B. 'STATUS', 'KATEGORIE') */
export function useStammdaten(kategorie: string) {
  return useOData<Stammdaten>(
    'Stammdaten',
    queryKeys.stammdaten(kategorie),
    odataQueries.stammdaten.byKategorie(kategorie),
    { staleTime: 10 * 60 * 1000 } // 10 Minuten Cache (Stammdaten ändern sich selten)
  );
}

/** Gibt nur die Werte einer Kategorie als flaches Array zurück */
export function useStammdatenWerte(kategorie: string): string[] {
  const { data } = useStammdaten(kategorie);
  return data?.value.map((s) => s.Wert) ?? [];
}
