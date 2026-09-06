"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";

const CAÑETE_CENTER: [number, number] = [-13.0833, -76.3833];

// Cualquier coordenada numérica y finita cuenta como "real" — el geocoder
// ya se encarga de devolver un fallback duro (centro de San Vicente de
// Cañete) cuando Nominatim no encuentra la dirección, así que nunca
// guardamos el placeholder del schema.
function tieneCoordenadasReales(p: { lat: number; lng: number }) {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

// Filtro regional: descartamos coordenadas a más de ~200 km de Cañete para
// evitar pines en otros países por GPS de prueba, geocoding erróneo, o
// datos importados de otra zona.
const MAX_DISTANCE_KM = 200;

function estaEnZonaCañete(lat: number, lng: number): boolean {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat - CAÑETE_CENTER[0]);
  const dLon = toRad(lng - CAÑETE_CENTER[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(CAÑETE_CENTER[0])) * Math.cos(toRad(lat)) *
      Math.sin(dLon / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a));
  return km <= MAX_DISTANCE_KM;
}

function repartidorIcon(estado: string) {
  const color =
    estado === "disponible" ? "#059669" : estado === "ocupado" ? "#d97706" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `
      <div style="width:40px;height:40px;border-radius:50%;background:white;border:3px solid ${color};box-shadow:0 2px 6px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;">
        🏍️
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function pedidoIcon(estado: string) {
  const color =
    estado === "entregado" ? "#059669" : estado === "pendiente" ? "#64748b" : "#2563eb";
  return L.divIcon({
    className: "",
    html: `
      <div style="width:36px;height:36px;position:relative;">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 3px rgba(15,23,42,.3));">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
        </svg>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
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

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      CAÑETE_CENTER,
      14
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

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
      L.marker([r.lat, r.lng], { icon: repartidorIcon(r.estado) })
        .bindPopup(
          `<strong>${r.nombre}</strong><br/>${r.estado}<br/><span style="color:#64748b;font-size:11px;">${r.telefono}</span>`
        )
        .addTo(repGroup);
      puntos.push([r.lat, r.lng]);
    });

    pedidos.forEach((p) => {
      // Solo mostramos un pin fijo por pedido si tiene coordenadas reales
      // (geocodificadas al crear/editar) y todavía no se marcó como entregado.
      if (!tieneCoordenadasReales(p)) return;
      if (p.estado === "entregado") return;
      if (!estaEnZonaCañete(p.lat, p.lng)) return;
      L.marker([p.lat, p.lng], { icon: pedidoIcon(p.estado) })
        .bindPopup(
          `<strong>${p.codigo}</strong><br/>${p.empresa}<br/>${p.direccion_entrega}<br/>${p.estado}`
        )
        .addTo(pedGroup);
      puntos.push([p.lat, p.lng]);
    });

    if (puntos.length > 1) {
      map.fitBounds(L.latLngBounds(puntos), {
        padding: [40, 40],
        maxZoom: 16,
      });
    } else if (puntos.length === 1) {
      map.setView(puntos[0], 15);
    }
  }, [repartidores, pedidos]);

  return <div ref={containerRef} className="h-full w-full" />;
}