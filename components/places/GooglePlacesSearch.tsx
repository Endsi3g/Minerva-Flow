"use client";

import { useEffect, useRef, useState } from "react";
import { Field, Input } from "@/components/minerva/FormField";
import { searchPlacesAction, getPlaceDetailsAction, isGooglePlacesEnabledAction } from "@/app/[locale]/(app)/settings/actions";
import type { RestaurantInput } from "@/lib/data/restaurants";
import { MapPin, Loader2, Search } from "lucide-react";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export function GooglePlacesSearch({ onSelect }: { onSelect: (patch: Partial<RestaurantInput>) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; primaryText: string; secondaryText: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isGooglePlacesEnabledAction().then(setEnabled);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchPlacesAction(query).then((results) => {
        setSuggestions(results);
        setOpen(results.length > 0);
        setSearching(false);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleSelect(placeId: string, label: string) {
    setImporting(placeId);
    const patch = await getPlaceDetailsAction(placeId);
    setImporting(null);
    setOpen(false);
    setQuery(label);
    if (patch) onSelect(patch);
  }

  if (!enabled) return null;

  return (
    <Field label="Rechercher sur Google" hint="Importe adresse, coordonnées, téléphone et horaires automatiquement">
      <div className="relative">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Nom de l'établissement ou adresse"
            className="pl-8"
          />
          {searching && (
            <Loader2 size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-mv-ink-faint" />
          )}
        </div>

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-mv-border bg-mv-surface shadow-mv-lg">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s.placeId, s.primaryText)}
                disabled={Boolean(importing)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-mv-cream-soft disabled:opacity-50"
              >
                {importing === s.placeId ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-mv-ink-faint" />
                ) : (
                  <MapPin size={14} className="shrink-0 text-mv-ink-faint" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-mv-ink">{s.primaryText}</span>
                  {s.secondaryText && (
                    <span className="block truncate text-[11.5px] text-mv-ink-faint">{s.secondaryText}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}
