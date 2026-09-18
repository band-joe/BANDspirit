'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KontaktTag {
  id: string;
  bezeichnung: string;
  farbe: string;
  aktiv: boolean;
}

interface KontaktTagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function KontaktTagSelector({ selectedTagIds, onChange, disabled = false, compact = false }: KontaktTagSelectorProps) {
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<KontaktTag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/kontakt-tags?aktiv=true')
      .then(r => r.json())
      .then(d => setAllTags(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/kontakt-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bezeichnung: newTagName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Fehler');
      }
      const tag = await res.json();
      setAllTags(prev => [...prev, tag].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung)));
      onChange([...selectedTagIds, tag.id]);
      setNewTagName('');
      toast({ title: 'Tag erstellt', description: `"${tag.bezeichnung}" wurde angelegt.` });
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Tag konnte nicht erstellt werden.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = allTags.filter(t => !selectedTagIds.includes(t.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
        {selectedTags.map(tag => (
          <Badge
            key={tag.id}
            className="text-xs font-medium flex items-center gap-1 px-2 py-0.5"
            style={{ backgroundColor: tag.farbe + '20', color: tag.farbe, borderColor: tag.farbe + '40' }}
            variant="outline"
          >
            <Tag className="h-3 w-3" />
            {tag.bezeichnung}
            {!disabled && (
              <button onClick={() => removeTag(tag.id)} className="ml-0.5 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Plus className="h-3 w-3" /> Tag
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute z-50 mt-1 w-64 bg-background border rounded-lg shadow-lg p-2 space-y-2">
          {availableTags.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                  onClick={() => toggleTag(tag.id)}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.farbe }} />
                  {tag.bezeichnung}
                </button>
              ))}
            </div>
          )}
          {availableTags.length > 0 && <div className="border-t" />}
          <div className="flex gap-1.5">
            <Input
              placeholder="Neuen Tag erstellen..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTag(); } }}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 px-2"
              onClick={createTag}
              disabled={!newTagName.trim() || creating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
