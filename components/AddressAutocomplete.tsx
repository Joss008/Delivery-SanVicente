"use client";

import * as React from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddressSuggestion = {
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  category?: string;
};

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Notifica al padre cuando el usuario elige una sugerencia del dropdown. */
  onSelect?: (sugerencia: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  /** Desactiva el dropdown (input sigue editable, no se sugieren resultados). */
  disabled?: boolean;
}

/**
 * Input estilo Google Maps para direcciones: tipea → debounce 300 ms → pide
 * sugerencias al backend (/api/geocode/search) → muestra dropdown navegable
 * con teclado (↑/↓/Enter/Esc). La dirección final se guarda como texto en
 * `value` (igual que el form actual); `onSelect` entrega además lat/lng.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Busca una dirección (ej. Av. Mariscal Benavides 450, Cañete)",
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [sugerencias, setSugerencias] = React.useState<AddressSuggestion[]>([]);
  const [cargando, setCargando] = React.useState(false);
  const [abierto, setAbierto] = React.useState(false);
  const [activo, setActivo] = React.useState(-1);
  const contenedorRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Debounce de 300 ms al cambiar el texto.
  React.useEffect(() => {
    const q = value.trim();
    if (disabled) return;
    if (q.length < 3) {
      setSugerencias([]);
      setCargando(false);
      return;
    }
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setCargando(true);
      try {
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(q)}&limit=6`,
          { signal: ctrl.signal }
        );
        if (!res.ok) {
          setSugerencias([]);
          return;
        }
        const data = (await res.json()) as { sugerencias: AddressSuggestion[] };
        setSugerencias(data.sugerencias ?? []);
        setActivo(data.sugerencias?.length ? 0 : -1);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setSugerencias([]);
      } finally {
        setCargando(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [value, disabled]);

  // Cerrar dropdown al click fuera.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function elegir(s: AddressSuggestion) {
    onChange(s.displayName);
    setAbierto(false);
    onSelect?.(s);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activo >= 0 && activo < sugerencias.length) {
        e.preventDefault();
        elegir(sugerencias[activo]);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  const mostrarDropdown =
    abierto && !disabled && (sugerencias.length > 0 || cargando);

  return (
    <div ref={contenedorRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={mostrarDropdown}
          aria-autocomplete="list"
          aria-controls="address-autocomplete-listbox"
          aria-activedescendant={
            activo >= 0 ? `addr-opt-${activo}` : undefined
          }
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-input bg-white py-2 pl-8 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {cargando && (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {mostrarDropdown && (
        <ul
          id="address-autocomplete-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {cargando && sugerencias.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando direcciones…
            </li>
          )}
          {!cargando && sugerencias.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              Sin resultados. Prueba con otra calle o agrega la ciudad.
            </li>
          )}
          {sugerencias.map((s, i) => (
            <li
              key={`${s.lat},${s.lng}-${i}`}
              id={`addr-opt-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseEnter={() => setActivo(i)}
              onMouseDown={(e) => {
                // mousedown para que se dispare antes del blur del input.
                e.preventDefault();
                elegir(s);
              }}
              className={cn(
                "flex cursor-pointer items-start gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-0",
                i === activo ? "bg-muted/70" : "hover:bg-muted/40"
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="line-clamp-2 text-foreground/90">
                {s.displayName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}