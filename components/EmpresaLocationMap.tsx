"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin, MapPinOff, Building2 } from "lucide-react";
import {
  Coords,
  GeoJSONPolygon,
  GeocodeResult,
  geocodeUbigeo,
  PERU_CENTER,
} from "@/lib/geocode-empresa";
import { useEffect, useRef, useState } from "react";

// Leaflet no se puede renderizar en SSR (depende de window). Cargamos el
// mapa real sólo en cliente.
const EmpresaLeafletMap = dynamic(() => import("./EmpresaLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Cargando mapa…
    </div>
  ),
});

export default function EmpresaLocationMap({
  departamento,
  provincia,
  distrito,
  direccionExacta,
}: {
  departamento: string;
  provincia: string;
  distrito: string;
  direccionExacta: string;
}) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geojson, setGeojson] = useState<GeoJSONPolygon | null>(null);
  const [loading, setLoading] = useState(false);
  // Generamos un id único por "dirección efectiva" para evitar geocodificar
  // el mismo input varias veces (Strict Mode, doble efecto, etc.).
  const lastQueryRef = useRef<string>("");

  useEffect(() => {
    const key = [
      departamento.trim(),
      provincia.trim(),
      distrito.trim(),
      direccionExacta.trim(),
    ]
      .filter(Boolean)
      .join("|");
    if (key === lastQueryRef.current) return;
    lastQueryRef.current = key;

    if (!departamento || !provincia || !distrito) {
      setCoords(null);
      setGeojson(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    geocodeUbigeo(departamento, provincia, distrito, direccionExacta)
      .then((result: GeocodeResult | null) => {
        if (cancelled) return;
        setCoords(result?.coords ?? null);
        setGeojson(result?.geojson ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [departamento, provincia, distrito, direccionExacta]);

  if (!departamento || !provincia || !distrito) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Selecciona <strong className="font-semibold text-foreground">departamento</strong>,{" "}
          <strong className="font-semibold text-foreground">provincia</strong> y{" "}
          <strong className="font-semibold text-foreground">distrito</strong> para ver la
          ubicación en el mapa.
        </p>
      </div>
    );
  }

  const direccionCompleta = [
    direccionExacta.trim(),
    distrito,
    provincia,
    departamento,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-2">
      <div className="relative h-56 overflow-hidden rounded-md border border-border bg-muted/30">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Ubicando en el mapa…
            </div>
          </div>
        )}
        <EmpresaLeafletMap coords={coords} geojson={geojson} />
      </div>
      <div
        className={`flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] ${
          coords
            ? "bg-primary/5 text-foreground/80"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        {coords ? (
          geojson ? (
            <Building2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          ) : (
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          )
        ) : (
          <MapPinOff className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
        )}
        <span>
          {coords ? (
            geojson ? (
              <>
                <span className="font-semibold">Edificio identificado:</span>{" "}
                {direccionCompleta}. La silueta del local se muestra sobre el
                mapa.
              </>
            ) : (
              <>
                <span className="font-semibold">Ubicación encontrada:</span>{" "}
                {direccionCompleta}. Nominatim no devolvió la huella del
                edificio para este punto.
              </>
            )
          ) : (
            <>
              No pudimos ubicar{" "}
              <span className="font-semibold">{direccionCompleta}</span>{" "}
              automáticamente. El pedido seguirá usando esta referencia textual.
            </>
          )}
        </span>
      </div>
    </div>
  );
}