"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";
import type { EmpresaPin } from "./MapView";

const CAÑETE_CENTER: [number, number] = [-13.0833, -76.3833];

function tieneCoordenadasReales(p: { lat: number; lng: number }) {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

const MAX_DISTANCE_KM = 200;

function estaEnZonaCañete(lat: number, lng: number): boolean {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat - CAÑETE_CENTER[0]);
  const dLon = toRad(lng - CAÑETE_CENTER[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(CAÑETE_CENTER[0])) *
      Math.cos(toRad(lat)) *
      Math.sin(dLon / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a));
  return km <= MAX_DISTANCE_KM;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActiveRecently(ubicacion_recibida_en: string | null): boolean {
  if (!ubicacion_recibida_en) return false;
  const last = new Date(ubicacion_recibida_en.replace(" ", "T") + "Z").getTime();
  return Date.now() - last < 60_000;
}

function timeAgo(ubicacion_recibida_en: string | null): string {
  if (!ubicacion_recibida_en) return "Sin datos";
  const last = new Date(ubicacion_recibida_en.replace(" ", "T") + "Z").getTime();
  const diff = Math.floor((Date.now() - last) / 1000);
  if (diff < 60) return "Hace segundos";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

function repartidorIcon(
  nombre: string,
  estado: string,
  reciente: boolean,
  pausado: boolean
) {
  const color =
    estado === "disponible"
      ? "#10b981"
      : estado === "ocupado"
        ? "#f59e0b"
        : "#94a3b8";
  const initials = getInitials(nombre);
  // Cuando el repartidor puso "Fuera de servicio" en la PWA, atenuamos el
  // marker: borde gris, fondo gris claro, sin pulso, e ícono de pausa abajo.
  const borderColor = pausado ? "#94a3b8" : color;
  const textColor = pausado ? "#475569" : color;
  const bg = pausado ? "#f1f5f9" : "white";
  const shadow = pausado
    ? "0 1px 4px rgba(0,0,0,0.10)"
    : "0 2px 8px rgba(0,0,0,0.18)";
  return L.divIcon({
    className: "",
    html: `
      <div class="repartidor-marker ${reciente && !pausado ? "repartidor-marker--active" : ""}" style="
        position: relative;
        width: 42px;
        height: 42px;
        opacity: ${pausado ? "0.75" : "1"};
      ">
        ${reciente && !pausado ? `<span class="repartidor-pulse" style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid ${color};
          animation: pulse-ring 2s ease-out infinite;
        "></span>` : ""}
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: ${bg};
          border: 3px solid ${borderColor};
          border-style: ${pausado ? "dashed" : "solid"};
          box-shadow: ${shadow};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          font-family: system-ui, -apple-system, sans-serif;
          color: ${textColor};
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
        ">
          ${initials}
        </div>
        ${pausado ? `<span style="
          position: absolute;
          bottom: -4px;
          right: -4px;
          z-index: 2;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #475569;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="5" width="4" height="14" rx="1"/>
            <rect x="14" y="5" width="4" height="14" rx="1"/>
          </svg>
        </span>` : ""}
      </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function pedidoIcon(estado: string) {
  const color =
    estado === "entregado"
      ? "#10b981"
      : estado === "pendiente"
        ? "#64748b"
        : "#2563eb";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 40px;
        position: relative;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18));
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30">
          <path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 20 10 20s10-12.5 10-20C22 4.48 17.52 0 12 0z" fill="${color}"/>
          <circle cx="12" cy="10" r="4" fill="white"/>
        </svg>
      </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
}

/**
 * Pin permanente del local de la empresa. Casa blanca con techo azul,
 * diferenciado de los repartidores (círculo) y de los pedidos (globo).
 */
function empresaIcon(label?: string) {
  const safeLabel = (label ?? "Local")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 52px;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
          <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 30 22 30s22-13.5 22-30C44 9.85 34.15 0 22 0z" fill="#2563eb"/>
          <circle cx="22" cy="22" r="11" fill="white"/>
          <path d="M14 27 L14 21 L22 14 L30 21 L30 27 L26 27 L26 23 L18 23 L18 27 Z" fill="#2563eb"/>
          <rect x="20" y="24" width="4" height="3" fill="#2563eb"/>
        </svg>
        <div style="
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: white;
          color: #0f172a;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 9999px;
          border: 1px solid #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        ">
          ${safeLabel}
        </div>
      </div>`,
    iconSize: [44, 52],
    iconAnchor: [22, 52],
  });
}

function buildRepartidorPopup(r: Repartidor): string {
  const pausado = !!r.gps_pausado_en;
  const estadoColor = pausado
    ? "#64748b"
    : r.estado === "disponible"
      ? "#10b981"
      : r.estado === "ocupado"
        ? "#f59e0b"
        : "#94a3b8";
  const estadoLabel = pausado
    ? "Fuera de servicio"
    : r.estado === "disponible"
      ? "Disponible"
      : r.estado === "ocupado"
        ? "Ocupado"
        : "Inactivo";
  const ultimaLinea = pausado
    ? `Pausado ${timeAgo(r.gps_pausado_en)}<br/>Última señal: ${timeAgo(r.ubicacion_recibida_en)}`
    : `📞 ${r.telefono}<br/>⏱ ${timeAgo(r.ubicacion_recibida_en)}`;
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 170px;">
      <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
        ${r.nombre}
      </div>
      <div style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 9999px; background: ${estadoColor}15; color: ${estadoColor}; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${estadoColor};"></span>
        ${estadoLabel}
      </div>
      <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
        ${ultimaLinea}
      </div>
    </div>`;
}

function buildPedidoPopup(p: PedidoConRepartidor): string {
  const estadoColor =
    p.estado === "entregado"
      ? "#10b981"
      : p.estado === "pendiente"
        ? "#64748b"
        : p.estado === "en_camino"
          ? "#2563eb"
          : p.estado === "asignado"
            ? "#8b5cf6"
            : "#ef4444";
  const estadoLabel =
    p.estado === "pendiente"
      ? "Pendiente"
      : p.estado === "asignado"
        ? "Asignado"
        : p.estado === "en_camino"
          ? "En camino"
          : p.estado === "entregado"
            ? "Entregado"
            : "Disputado";
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 170px;">
      <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
        ${p.codigo}
      </div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        ${p.empresa}
      </div>
      <div style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 9999px; background: ${estadoColor}15; color: ${estadoColor}; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${estadoColor};"></span>
        ${estadoLabel}
      </div>
      <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
        📍 ${p.direccion_entrega}
        ${p.repartidor_nombre ? `<br/>🏍 ${p.repartidor_nombre}` : ""}
      </div>
    </div>`;
}

export default function LeafletMap({
  repartidores,
  pedidos,
  empresaPin,
}: {
  repartidores: Repartidor[];
  pedidos: PedidoConRepartidor[];
  empresaPin?: EmpresaPin | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const repGroupRef = useRef<L.LayerGroup | null>(null);
  const pedGroupRef = useRef<L.LayerGroup | null>(null);
  const empMarkerRef = useRef<L.Marker | null>(null);
  const initializedRef = useRef(false);
  /**
   * Se activa en cuanto el usuario hace pan o zoom manualmente. A partir de
   * ese momento NO volvemos a llamar `fitBounds`/`setView` en los refreshes
   * periódicos (cada 15 s), para no pisar el encuadre que el operador eligió.
   */
  const usuarioMovioMapaRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(CAÑETE_CENTER, 14);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
        attribution: "© OpenStreetMap",
      }
    ).addTo(map);

    L.control
      .zoom({ position: "topright" })
      .addTo(map);

    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addTo(map);

    repGroupRef.current = L.layerGroup().addTo(map);
    pedGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Marcamos el flag cuando el operador interactúa con el mapa. Leaflet
    // también emite estos eventos cuando el zoom se programa (p.ej. doble
    // tap), así que es suficiente para detectar intención del usuario.
    const onUserPan = () => {
      usuarioMovioMapaRef.current = true;
    };
    const onUserZoom = () => {
      usuarioMovioMapaRef.current = true;
    };
    map.on("dragstart zoomstart", onUserPan);
    map.on("zoomstart", onUserZoom);

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.off("dragstart zoomstart", onUserPan);
      map.off("zoomstart", onUserZoom);
      map.remove();
      mapRef.current = null;
      repGroupRef.current = null;
      pedGroupRef.current = null;
      empMarkerRef.current = null;
      initializedRef.current = false;
      usuarioMovioMapaRef.current = false;
    };
  }, []);

  // Pin permanente del local de la empresa. Se actualiza (no se recrea) cuando
  // cambia la prop; NO participa del fitBounds, sólo sirve como referencia
  // visual del negocio en el mapa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (empMarkerRef.current) {
      map.removeLayer(empMarkerRef.current);
      empMarkerRef.current = null;
    }
    if (!empresaPin) return;
    if (
      !Number.isFinite(empresaPin.lat) ||
      !Number.isFinite(empresaPin.lng)
    ) {
      return;
    }
    const marker = L.marker([empresaPin.lat, empresaPin.lng], {
      icon: empresaIcon(empresaPin.label),
      keyboard: false,
      zIndexOffset: 500,
    }).bindPopup(
      `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 150px;">
        <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
          📍 Local
        </div>
        <div style="font-size: 12px; color: #475569;">
          ${(empresaPin.label ?? "Punto de recojo").replace(/</g, "&lt;")}
        </div>
      </div>`,
      { className: "custom-popup" }
    );
    marker.addTo(map);
    empMarkerRef.current = marker;
  }, [empresaPin]);

  useEffect(() => {
    const map = mapRef.current;
    const repGroup = repGroupRef.current;
    const pedGroup = pedGroupRef.current;
    if (!map || !repGroup || !pedGroup) return;

    repGroup.clearLayers();
    pedGroup.clearLayers();

    // Marcamos los repartidores y pedidos en sus layers. Sólo los repartidores
    // entran al fitBounds de fallback (los pedidos NO, para que un pedido
    // lejano no descuadre la flota de Cañete).
    const puntosRepartidores: L.LatLngTuple[] = [];

    repartidores.forEach((r) => {
      if (!tieneCoordenadasReales(r)) return;
      if (!estaEnZonaCañete(r.lat, r.lng)) return;
      const reciente = isActiveRecently(r.ubicacion_recibida_en);
      const pausado = !!r.gps_pausado_en;
      L.marker([r.lat, r.lng], {
        icon: repartidorIcon(r.nombre, r.estado, reciente, pausado),
      })
        .bindPopup(buildRepartidorPopup(r), {
          className: "custom-popup",
        })
        .addTo(repGroup);
      puntosRepartidores.push([r.lat, r.lng]);
    });

    pedidos.forEach((p) => {
      if (!tieneCoordenadasReales(p)) return;
      if (p.estado === "entregado") return;
      if (!estaEnZonaCañete(p.lat, p.lng)) return;
      L.marker([p.lat, p.lng], { icon: pedidoIcon(p.estado) })
        .bindPopup(buildPedidoPopup(p), {
          className: "custom-popup",
        })
        .addTo(pedGroup);
    });

    if (usuarioMovioMapaRef.current) {
      // El operador ya hizo pan/zoom manualmente: respetamos su encuadre y
      // NO sobrescribimos el zoom en cada refresh periódico (cada 15 s).
      return;
    }

    // Ancla principal: el local de la empresa. Si está geocodificado
    // centramos ahí con un nivel de zoom que muestre ~1 km a la redonda,
    // suficiente para ver la flota en Cañete sin zoomear de más.
    if (
      empresaPin &&
      Number.isFinite(empresaPin.lat) &&
      Number.isFinite(empresaPin.lng)
    ) {
      map.setView([empresaPin.lat, empresaPin.lng], 14);
      return;
    }

    // Sin pin del local: caemos al fitBounds de los repartidores para que el
    // operador no quede mirando un mapa genérico de Cañete.
    if (puntosRepartidores.length > 1) {
      map.fitBounds(L.latLngBounds(puntosRepartidores), {
        padding: [50, 50],
        maxZoom: 16,
      });
    } else if (puntosRepartidores.length === 1) {
      map.setView(puntosRepartidores[0], 15);
    }
  }, [repartidores, pedidos, empresaPin]);

  return <div ref={containerRef} className="relative h-full w-full" />;
}
