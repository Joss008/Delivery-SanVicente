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

export default function MapView({
  repartidores,
  pedidos,
}: {
  repartidores: Repartidor[];
  pedidos: PedidoConRepartidor[];
}) {
  return <LeafletMap repartidores={repartidores} pedidos={pedidos} />;
}
