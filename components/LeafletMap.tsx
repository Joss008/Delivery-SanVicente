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
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 3px rgba(15,23,42,.25)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function pedidoIcon(estado: string) {
  const color =
    estado === "entregado" ? "#059669" : estado === "pendiente" ? "#64748b" : "#2563eb";
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:4px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(15,23,42,.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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
        .bindPopup(`<strong>Pedido #${p.id}</strong><br/>${p.cliente}<br/>${p.estado}`)
        .addTo(pedGroup);
    });

    return () => {
      map.remove();
    };
  }, [repartidores, pedidos]);

  return <div id="map" className="h-full w-full" />;
}
