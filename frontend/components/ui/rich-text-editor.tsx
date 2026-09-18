'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, RemoveFormatting } from 'lucide-react';

/**
 * Rudimentärer Rich-Text-Editor (ohne externe Abhängigkeiten).
 *
 * Basiert auf contentEditable + document.execCommand und bietet die
 * Grundfunktionen Fett, Kursiv, Unterstrichen, Aufzählung, Nummerierung sowie
 * "Formatierung entfernen". Der Inhalt wird als einfaches HTML nach oben
 * gemeldet (onChange).
 */

/** Erlaubte Tags für die gespeicherte/angezeigte HTML-Ausgabe. */
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);

/**
 * Einfache Bereinigung des HTML: entfernt nicht erlaubte Tags (behält deren
 * Textinhalt) und sämtliche Attribute (z. B. onclick, style, href). Damit
 * werden Skript-/Event-Einschleusungen verhindert.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          // Nicht erlaubtes Element durch seinen Textinhalt ersetzen
          const text = document.createTextNode(el.textContent ?? '');
          el.replaceWith(text);
          continue;
        }
        // Alle Attribute entfernen
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
        walk(el);
      }
    }
  };
  walk(template.content);
  return template.innerHTML;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Anfangswert setzen (nur wenn er vom aktuellen Editor-Inhalt abweicht),
  // damit der Cursor beim Tippen nicht springt.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const exec = (command: string) => {
    editorRef.current?.focus();
    // execCommand ist veraltet, funktioniert aber in allen gängigen Browsern
    // und ist für einen rudimentären Editor ausreichend.
    document.execCommand(command, false);
    emitChange();
  };

  const emitChange = () => {
    if (editorRef.current) {
      onChange(sanitizeRichText(editorRef.current.innerHTML));
    }
  };

  const isEmpty = !value || value.replace(/<[^>]*>/g, '').trim() === '';

  const buttonClass = 'p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors';

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1">
        <button type="button" className={buttonClass} title="Fett" onMouseDown={e => { e.preventDefault(); exec('bold'); }}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={buttonClass} title="Kursiv" onMouseDown={e => { e.preventDefault(); exec('italic'); }}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={buttonClass} title="Unterstrichen" onMouseDown={e => { e.preventDefault(); exec('underline'); }}>
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={buttonClass} title="Aufzählung" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={buttonClass} title="Nummerierte Liste" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={buttonClass} title="Formatierung entfernen" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}>
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          className="min-h-[140px] max-h-[320px] overflow-y-auto px-3 py-2 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        />
      </div>
    </div>
  );
}
