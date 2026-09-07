"use client";

import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Buscador con autocompletado para listas largas (ej. los 1800+ distritos
 * del Perú). Se comporta como un input de búsqueda nativo:
 *  - el campo es siempre editable,
 *  - al enfocarse (o al escribir) muestra debajo las opciones filtradas,
 *  - clic en una sugerencia la selecciona,
 *  - clic fuera o Escape cierra la lista y revierte el texto al valor guardado.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  disabled = false,
  emptyMessage = "Sin resultados",
  className,
}: ComboboxProps) {
  const [texto, setTexto] = React.useState(value);
  const [abierto, setAbierto] = React.useState(false);
  const contenedorRef = React.useRef<HTMLDivElement>(null);

  // Sincronizamos el texto interno cuando cambia el valor desde fuera
  // (p.ej. al pasar de "Editar empresa" a "Nueva empresa").
  React.useEffect(() => {
    setTexto(value);
  }, [value]);

  React.useEffect(() => {
    if (!abierto) return;
    function onClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setTexto(value);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        setTexto(value);
      }
    }
    document.addEventListener("mousedown", onClickAfuera);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAfuera);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto, value]);

  const filtrados = React.useMemo(() => {
    const q = texto.trim().toLowerCase();
    const lista = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    // Limitamos a 100 resultados visibles para que el dropdown no sea
    // interminable cuando el input está vacío. El usuario puede tipear
    // para acotar.
    return lista.slice(0, 100);
  }, [texto, options]);

  const mostrarDropdown = abierto && !disabled;

  function seleccionar(opt: string) {
    onChange(opt);
    setTexto(opt);
    setAbierto(false);
  }

  function limpiar() {
    onChange("");
    setTexto("");
  }

  return (
    <div ref={contenedorRef} className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          inputClass,
          "pl-8",
          value && !disabled ? "pr-9" : "pr-3"
        )}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={limpiar}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Limpiar selección"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {mostrarDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {filtrados.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
              {filtrados.map((opt) => {
                const seleccionado = opt === value;
                return (
                  <li key={opt} role="option" aria-selected={seleccionado}>
                    <button
                      type="button"
                      onClick={() => seleccionar(opt)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted",
                        seleccionado && "bg-primary/10 font-medium text-primary"
                      )}
                    >
                      <span className="truncate">{opt}</span>
                      {seleccionado && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
