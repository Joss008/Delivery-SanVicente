"use client";

import { Card } from "@/components/ui";

export default function MapLegendCard() {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Leyenda
      </h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[3px] border-emerald-600 bg-white text-[12px] leading-none">
            🏍️
          </span>
          <span className="text-foreground">Repartidor disponible</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[3px] border-amber-500 bg-white text-[12px] leading-none">
            🏍️
          </span>
          <span className="text-foreground">Repartidor ocupado</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </span>
          <span className="text-foreground">Pedido pendiente</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-blue-600">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </span>
          <span className="text-foreground">Pedido en curso</span>
        </li>
        <li className="flex items-center gap-3 text-muted-foreground">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-emerald-600">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </span>
          <span className="line-through">Entregado (oculto)</span>
        </li>
      </ul>
    </Card>
  );
}