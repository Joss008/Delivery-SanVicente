"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, ShieldOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui";
import { authFetch } from "@/lib/clientAuth";
import { cn } from "@/lib/utils";

interface AntifraudeResumen {
  reclamosRecientes: number;
  intentosFallidosSemana: number;
  entregasSospechosas: number;
  pedidosDisputados: number;
}

interface AntifraudeRepartidor {
  id: number;
  nombre: string;
  telefono: string;
  entregas_totales: number;
  entregas_sospechosas: number;
  reclamos_totales: number;
  ultima_alerta_en: string | null;
}

export default function AntifraudPanel() {
  const [resumen, setResumen] = useState<AntifraudeResumen | null>(null);
  const [repartidores, setRepartidores] = useState<AntifraudeRepartidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/antifraude");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo cargar el resumen antifraude");
        return;
      }
      setResumen(body.resumen ?? null);
      setRepartidores(Array.isArray(body.repartidores) ? body.repartidores : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Panel antifraude
          </h2>
          <p className="text-sm text-muted-foreground">
            Repartidores e indicadores para detectar y revisar entregas
            sospechosas.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          type="button"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualizar
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard
          icon={ShieldAlert}
          label="Reclamos (30 d)"
          value={resumen?.reclamosRecientes ?? 0}
          tone="bg-red-50 text-red-600"
        />
        <KpiCard
          icon={ShieldOff}
          label="Intentos OTP fallidos (7 d)"
          value={resumen?.intentosFallidosSemana ?? 0}
          tone="bg-amber-50 text-amber-600"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Entregas con alerta (30 d)"
          value={resumen?.entregasSospechosas ?? 0}
          tone="bg-amber-50 text-amber-600"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Pedidos en disputa"
          value={resumen?.pedidosDisputados ?? 0}
          tone="bg-slate-100 text-slate-700"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Repartidores en observación</h3>
          <p className="text-xs text-muted-foreground">
            Aparecen los que acumulan más de 2 reclamos o cuya tasa de
            entregas sospechosas supera el 20%.
          </p>
        </div>
        {repartidores.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Sin alertas. Buen trabajo.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Nombre</th>
                <th className="px-5 py-2.5 font-medium">Teléfono</th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Entregas
                </th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Sospechosas
                </th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Reclamos
                </th>
                <th className="px-5 py-2.5 font-medium">Última alerta</th>
              </tr>
            </thead>
            <tbody>
              {repartidores.map((r) => {
                const tasa =
                  r.entregas_totales > 0
                    ? r.entregas_sospechosas / r.entregas_totales
                    : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 transition hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      {r.nombre}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.telefono}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {r.entregas_totales}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right",
                        tasa >= 0.2
                          ? "font-semibold text-amber-700"
                          : "text-muted-foreground"
                      )}
                    >
                      {r.entregas_sospechosas} ({Math.round(tasa * 100)}%)
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right",
                        r.reclamos_totales >= 2
                          ? "font-semibold text-red-700"
                          : "text-muted-foreground"
                      )}
                    >
                      {r.reclamos_totales}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {r.ultima_alerta_en ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}