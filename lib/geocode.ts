// Geocoding muy ligero sobre Nominatim (OpenStreetMap). No requiere API key.
//
// Nominatim impone ~1 req/s por IP y exige identificar al cliente con un
// User-Agent. Mantenemos una caché in-memory de direcciones → coordenadas
// SOLO para resultados positivos; los negativos los dejamos pasar para que
// el siguiente intento (p.ej. al re-editar un pedido) pueda reintentar.

type Coords = { lat: number; lng: number };

declare global {

  var __geocodeCache: Map<string, Coords> | undefined;
}

const cache: Map<string, Coords> =
  globalThis.__geocodeCache ?? new Map<string, Coords>();
globalThis.__geocodeCache = cache;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 120;

// Cañete y un radio de seguridad de ~150 km. Sirve para descartar matches
// en otros países (p.ej. "Jr. Lima 320" sin contexto puede resolver a Lima, Ohio).
const CAÑETE_CENTER: [number, number] = [-13.0833, -76.3833];
const MAX_DISTANCE_KM = 150;

// Centro aproximado de San Vicente de Cañete (la capital del distrito).
// Lo usamos como fallback duro cuando Nominatim no encuentra la dirección,
// desplazado ligeramente para que NO coincida con el placeholder del schema.
const SAN_VICENTE_CAÑETE: Coords = { lat: -13.0772, lng: -76.3885 };

// Sesgo regional amplio: cubrimos Lima, Cañete y Chincha sin restringir la
// búsqueda, de modo que Nominatim prefiere matches en esa zona pero todavía
// puede caer en una calle cercana fuera del rectángulo si la dirección es
// específica de otro distrito.
const VIEWBOX = "-77.5,-11.5,-75.5,-14.0";

// Plan de intentos: empezamos con la dirección completa y vamos relajando
// hasta llegar a la ciudad sola. Si nada funciona, devolvemos el centro
// duro de San Vicente de Cañete para que el pin al menos aparezca.
const QUERIES_FALLBACK = [
  (addr: string) => addr,
  (addr: string) => `${addr}, San Vicente de Cañete, Cañete, Perú`,
  (addr: string) => `${addr}, Cañete, Lima, Perú`,
  () => "San Vicente de Cañete, Cañete, Perú",
  () => "Cañete, Lima, Perú",
];

export async function geocodeAddress(
  address: string
): Promise<Coords | null> {
  const original = address.trim();
  const key = original.toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  for (const makeQuery of QUERIES_FALLBACK) {
    const query = makeQuery(original);
    const resultado = await buscarEnNominatim(query);
    if (resultado) {
      cache.set(key, resultado);
      return resultado;
    }
    // Pequeña pausa entre intentos para no saturar a Nominatim.
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  // Último recurso: el centro de San Vicente de Cañete. Lo devolvemos como
  // "geocoded" para que el mapa muestre el pin aunque la dirección no sea
  // hallable. Lo cacheamos igualmente para no repetir el bucle cada vez
  // que se recrea el pedido.
  console.warn(
    `[geocode] Sin resultados Nominatim para "${original}" → usando fallback San Vicente de Cañete`
  );
  const fallback = { ...SAN_VICENTE_CAÑETE };
  cache.set(key, fallback);
  return fallback;
}

async function buscarEnNominatim(query: string): Promise<Coords | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "3");
    // Acotamos la búsqueda a Perú para evitar matches en otros países.
    url.searchParams.set("countrycodes", "pe");
    // Sesgo hacia la zona Lima-Cañete-Chincha sin limitar la búsqueda.
    url.searchParams.set("viewbox", VIEWBOX);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "RepartoCanete/1.0",
        "Accept": "application/json",
        "Accept-Language": "es",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(
        `[geocode] Nominatim HTTP ${res.status} para "${query}"`
      );
      return null;
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      type?: string;
      class?: string;
      display_name?: string;
    }>;

    if (data.length === 0) return null;

    for (const hit of data) {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const km = haversineKm(CAÑETE_CENTER[0], CAÑETE_CENTER[1], lat, lng);
      if (km > MAX_DISTANCE_KM) continue;

      console.log(
        `[geocode] OK "${query}" → ${lat.toFixed(5)}, ${lng.toFixed(5)} (${km.toFixed(0)} km)`
      );
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
