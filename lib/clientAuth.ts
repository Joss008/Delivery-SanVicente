const TOKEN_KEY = "auth:token";
const USER_KEY = "auth:usuario";

export interface StoredUser {
  id: number;
  rol_id: number;
  nombre: string;
  email: string;
  direccion?: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, usuario: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function setUser(usuario: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers });

  // Si el servidor rechaza la sesión, el token en localStorage ya no es
  // válido (BD rotada, admin recreado, etc.). Limpiamos y mandamos a login
  // para que el usuario no se quede en una pantalla rota. Excluimos el
  // endpoint de login para no entrar en bucle cuando las credenciales son
  // incorrectas (ahí el 401 es esperado y debe mostrarse como error).
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : "";
  const isLoginCall = url.includes("/api/auth/");
  if (res.status === 401 && token && !isLoginCall) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }

  return res;
}
