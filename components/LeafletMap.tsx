"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";

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

function repartidorIcon(nombre: string, estado: string, reciente: boolean) {
  const color =
    estado === "disponible"
      ? "#10b981"
      : estado === "ocupado"
        ? "#f59e0b"
        : "#94a3b8";
  const initials = getInitials(nombre);
  return L.divIcon({
    className: "",
    html: `
      <div class="repartidor-marker ${reciente ? "repartidor-marker--active" : ""}" style="
        position: relative;
        width: 42px;
        height: 42px;
      ">
        ${reciente ? `<span class="repartidor-pulse" style="
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
          background: white;
          border: 3px solid ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          font-family: system-ui, -apple-system, sans-serif;
          color: ${color};
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
        ">
          ${initials}
        </div>
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

function buildRepartidorPopup(r: Repartidor): string {
  const estadoColor =
    r.estado === "disponible"
      ? "#10b981"
      : r.estado === "ocupado"
        ? "#f59e0b"
        : "#94a3b8";
  const estadoLabel =
    r.estado === "disponible"
      ? "Disponible"
      : r.estado === "ocupado"
        ? "Ocupado"
        : "Inactivo";
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 160px;">
      <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
        ${r.nombre}
      </div>
      <div style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 9999px; background: ${estadoColor}15; color: ${estadoColor}; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${estadoColor};"></span>
        ${estadoLabel}
      </div>
      <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
        📞 ${r.telefono}<br/>
        ⏱ ${timeAgo(r.ubicacion_recibida_en)}
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
}: {
  repartidores: Repartidor[];
  pedidos: PedidoConRepartidor[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const repGroupRef = useRef<L.LayerGroup | null>(null);
  const pedGroupRef = useRef<L.LayerGroup | null>(null);
  const initializedRef = useRef(false);

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

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      repGroupRef.current = null;
      pedGroupRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const repGroup = repGroupRef.current;
    const pedGroup = pedGroupRef.current;
    if (!map || !repGroup || !pedGroup) return;

    repGroup.clearLayers();
    pedGroup.clearLayers();

    const puntos: L.LatLngTuple[] = [];

    repartidores.forEach((r) => {
      if (!tieneCoordenadasReales(r)) return;
      if (!estaEnZonaCañete(r.lat, r.lng)) return;
      const reciente = isActiveRecently(r.ubicacion_recibida_en);
      L.marker([r.lat, r.lng], {
        icon: repartidorIcon(r.nombre, r.estado, reciente),
      })
        .bindPopup(buildRepartidorPopup(r), {
          className: "custom-popup",
        })
        .addTo(repGroup);
      puntos.push([r.lat, r.lng]);
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
      puntos.push([p.lat, p.lng]);
    });

    if (puntos.length > 1) {
      map.fitBounds(L.latLngBounds(puntos), {
        padding: [50, 50],
        maxZoom: 16,
      });
    } else if (puntos.length === 1) {
      map.setView(puntos[0], 15);
    }
  }, [repartidores, pedidos]);

  return <div ref={containerRef} className="relative h-full w-full" />;
}
