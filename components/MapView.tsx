"use client";

import dynamic from "next/dynamic";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Cargando mapa…
    </div>
  ),
});

export interface EmpresaPin {
  lat: number;
  lng: number;
  /** Texto que se muestra en el popup del pin (ej. nombre del local). */
  label?: string;
}

export default function MapView({
  repartidores,
  pedidos,
  empresaPin,
}: {
  repartidores: Repartidor[];
  pedidos: PedidoConRepartidor[];
  empresaPin?: EmpresaPin | null;
}) {
  return (
    <LeafletMap
      repartidores={repartidores}
      pedidos={pedidos}
      empresaPin={empresaPin ?? null}
    />
  );
}
