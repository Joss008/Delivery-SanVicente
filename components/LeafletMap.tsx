"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";

const CAÑETE_CENTER: [number, number] = [-13.0833, -76.3833];

function repartidorIcon(estado: string) {
  const color =
    estado === "disponible" ? "#059669" : estado === "ocupado" ? "#d97706" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `
      <div style="width:36px;height:36px;border-radius:50%;background:white;border:3px solid ${color};box-shadow:0 1px 4px rgba(15,23,42,.25);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;">
        🏍️
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
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
  useEffect(() => {
    const map = L.map("map").setView(CAÑETE_CENTER, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const repGroup = L.layerGroup().addTo(map);
    const pedGroup = L.layerGroup().addTo(map);

    repartidores.forEach((r) => {
      L.marker([r.lat, r.lng], { icon: repartidorIcon(r.estado) })
        .bindPopup(`<strong>${r.nombre}</strong><br/>${r.estado}`)
        .addTo(repGroup);
    });

    pedidos.forEach((p) => {
      L.marker([p.lat, p.lng], { icon: pedidoIcon(p.estado) })
        .bindPopup(`<strong>${p.codigo}</strong><br/>${p.descripcion}<br/>${p.estado}`)
        .addTo(pedGroup);
    });

    return () => {
      map.remove();
    };
  }, [repartidores, pedidos]);

  return <div id="map" className="h-full w-full" />;
}
