"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, MapPin, ShieldCheck } from "lucide-react";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { setSession, authFetch } from "@/lib/clientAuth";
import type { StoredUser } from "@/lib/clientAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("auth:token");
    if (token) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      const usuario = data.usuario as StoredUser;
      setSession(data.token as string, usuario);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Error de red. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(kind: "admin" | "empresa") {
    if (kind === "admin") {
      setEmail("admin@reparto.local");
      setPassword("admin123");
    } else {
      setEmail("casa@reparto.local");
      setPassword("demo1234");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Reparto Cañete</p>
            <p className="text-sm text-muted-foreground">Panel para empresas y administración</p>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa con tu cuenta de empresa o de administrador.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@reparto.local"
                required
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full justify-center" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "Entrando…" : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Cuentas de demostración
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="block font-medium text-foreground">Admin</span>
                <span className="block text-muted-foreground">admin@reparto.local · admin123</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("empresa")}
                className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="block font-medium text-foreground">Empresa</span>
                <span className="block text-muted-foreground">casa@reparto.local · demo1234</span>
              </button>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso para repartidores disponible desde la app móvil del repartidor.
        </p>
      </div>
    </div>
  );
}
