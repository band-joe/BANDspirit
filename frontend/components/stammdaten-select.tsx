'use client';

import { useStammdaten } from '@/hooks/use-stammdaten';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StammdatenSelectProps {
  kategorie: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Include an "Alle" option for filter selects */
  alleOption?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable select component that loads Stammdaten dynamically.
 * Use in forms and filters to replace hardcoded enum arrays.
 */
export function StammdatenSelect({
  kategorie,
  value,
  onValueChange,
  placeholder,
  alleOption,
  disabled,
  className,
}: StammdatenSelectProps) {
  const { data, isLoading } = useStammdaten(kategorie);
  const items = data?.value ?? [];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Laden...' : (placeholder ?? 'Auswählen...')} />
      </SelectTrigger>
      <SelectContent>
        {alleOption && <SelectItem value="all">{alleOption}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.Code} value={item.Code}>
            {item.Wert}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
