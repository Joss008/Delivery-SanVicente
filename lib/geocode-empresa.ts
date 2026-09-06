// Geocoding cliente-side (Nominatim) SIN restricción regional.
// Pensado para previsualizar la ubicación de una empresa en el formulario de
// administración. A diferencia de lib/geocode.ts (que filtra matches fuera
// de Cañete), este deja a Nominatim devolver cualquier punto del Perú.
//
// Cuando Nominatim encuentra el local como un edificio con geometría
// registrada en OSM, devuelve además un `geojson` con el polígono del
// edificio. Eso lo usamos para dibujar la huella del edificio sobre el
// mapa en EmpresaLeafletMap.

export type Coords = { lat: number; lng: number };

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeocodeResult = {
  coords: Coords;
  /** Polígono del edificio (si Nominatim lo devolvió). */
  geojson: GeoJSONPolygon | null;
};

const cache = new Map<string, GeocodeResult | null>();

export const PERU_CENTER: [number, number] = [-9.19, -75.02];

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeUbigeo(
  departamento: string,
  provincia: string,
  distrito: string,
  calle?: string
): Promise<GeocodeResult | null> {
  const d = departamento.trim();
  const p = provincia.trim();
  const dist = distrito.trim();
  const c = (calle ?? "").trim();

  if (!d || !p || !dist) return null;

  // Plan de intentos: de más específico a más general.
  const queries: string[] = [];
  if (c) {
    queries.push(`${c}, ${dist}, ${p}, ${d}, Perú`);
    queries.push(`${c}, ${dist}, ${d}, Perú`);
  }
  queries.push(`${dist}, ${p}, ${d}, Perú`);
  queries.push(`${p}, ${d}, Perú`);
  queries.push(`${d}, Perú`);

  for (const query of queries) {
    const result = await tryGeocode(query);
    if (result) return result;
  }
  return null;
}

async function tryGeocode(query: string): Promise<GeocodeResult | null> {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "pe");
    // Pedimos el detalle del edificio (polígono) cuando esté disponible.
    url.searchParams.set("polygon_geojson", "1");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
      },
    });

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      geojson?: GeoJSONPolygon;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      cache.set(key, null);
      return null;
    }

    const hit = data[0];
    const coords = {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
    };

    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      cache.set(key, null);
      return null;
    }

    const geojson =
      hit.geojson && hit.geojson.type === "Polygon" ? hit.geojson : null;

    const result: GeocodeResult = { coords, geojson };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}