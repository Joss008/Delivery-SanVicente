"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function MapLegendCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-[1000]">
      {open && (
        <div className="mb-2 rounded-xl border border-border bg-card/90 p-3 shadow-lg backdrop-blur-sm">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leyenda
          </h4>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-[10px] font-bold text-emerald-600"
              >
                RC
              </span>
              <span className="text-foreground">Disponible</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-white text-[10px] font-bold text-amber-600"
              >
                RC
              </span>
              <span className="text-foreground">Ocupado</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
                <svg viewBox="0 0 24 30" width="14" height="17">
                  <path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 20 10 20s10-12.5 10-20C22 4.48 17.52 0 12 0z" fill="currentColor"/>
                  <circle cx="12" cy="10" r="3" fill="white"/>
                </svg>
              </span>
              <span className="text-foreground">Pedido pendiente</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-blue-600">
                <svg viewBox="0 0 24 30" width="14" height="17">
                  <path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 20 10 20s10-12.5 10-20C22 4.48 17.52 0 12 0z" fill="currentColor"/>
                  <circle cx="12" cy="10" r="3" fill="white"/>
                </svg>
              </span>
              <span className="text-foreground">En camino</span>
            </li>
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground shadow-lg backdrop-blur-sm transition hover:bg-card hover:text-foreground"
        aria-label="Toggle leyenda"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        )}
      </button>
    </div>
  );
}
