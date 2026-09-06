"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Coords,
  GeoJSONPolygon,
  PERU_CENTER,
} from "@/lib/geocode-empresa";

function empresaPinIcon() {
  // Pin tipo gota con borde blanco, estilo coherente con el mapa del panel.
  return L.divIcon({
    className: "rc-empresa-pin",
    html: `
      <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#2563eb;transform:rotate(-45deg);box-shadow:0 4px 10px rgba(15,23,42,.35);border:3px solid white;display:flex;align-items:center;justify-content:center;">
        <div style="transform:rotate(45deg);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
            <path d="M6 21h6"/>
            <path d="M14 13h2l2 4h-4z"/>
            <path d="M19 9v6"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

// Convierte un GeoJSON Polygon ([lng, lat][]) a LatLng[] de Leaflet.
function polygonToLatLngs(polygon: GeoJSONPolygon): L.LatLng[][] {
  return polygon.coordinates.map((ring) =>
    ring.map(([lng, lat]) => L.latLng(lat, lng))
  );
}

export default function EmpresaLeafletMap({
  coords,
  geojson,
}: {
  coords: Coords | null;
  geojson: GeoJSONPolygon | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const buildingLayerRef = useRef<L.LayerGroup | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView(PERU_CENTER, 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    buildingLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      buildingLayerRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const buildingLayer = buildingLayerRef.current;
    if (!map || !buildingLayer) return;

    buildingLayer.clearLayers();

    if (geojson) {
      const rings = polygonToLatLngs(geojson);
      L.polygon(rings, {
        color: "#1d4ed8",
        weight: 2,
        opacity: 0.9,
        fillColor: "#3b82f6",
        fillOpacity: 0.25,
      }).addTo(buildingLayer);
    }

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (coords) {
      markerRef.current = L.marker([coords.lat, coords.lng], {
        icon: empresaPinIcon(),
      }).addTo(map);

      if (geojson) {
        // Si tenemos el polígono, centramos y hacemos zoom para mostrar la
        // huella completa del edificio.
        const rings = polygonToLatLngs(geojson);
        const bounds = L.latLngBounds(rings[0] ?? []);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });
        } else {
          map.setView([coords.lat, coords.lng], 18);
        }
      } else {
        map.setView([coords.lat, coords.lng], 15);
      }
    } else {
      map.setView(PERU_CENTER, 6);
    }
  }, [coords, geojson]);

  return <div ref={containerRef} className="h-full w-full" />;
}