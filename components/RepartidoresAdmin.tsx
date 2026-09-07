"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button, Card, Field, inputClass, Modal } from "@/components/ui";
import { Badge, ESTADO_REPARTIDOR } from "@/components/badges";
import { authFetch } from "@/lib/clientAuth";
import type { Repartidor } from "@/lib/types";

export default function RepartidoresAdmin() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Repartidor | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/repartidores");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo cargar la lista de repartidores");
      }
      setRepartidores((await res.json()) as Repartidor[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = repartidores.filter((r) =>
    `${r.nombre} ${r.telefono}`.toLowerCase().includes(query.toLowerCase())
  );

  async function handleDelete(r: Repartidor) {
    if (!confirm(`¿Eliminar el repartidor "${r.nombre}"?`)) return;
    const res = await authFetch(`/api/repartidores/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar el repartidor");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Repartidores externos</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {repartidores.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Motorizados disponibles para todos los pedidos de cualquier empresa.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Con Telegram activo</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {repartidores.filter((r) => r.telegram_chat_id).length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reciben alertas push cuando hay pedidos disponibles o se les asigna uno.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Repartidores externos</h2>
            <p className="text-xs text-muted-foreground">
              Alta y baja de motorizados que cubrirán los pedidos del sistema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar repartidor…"
                className={`${inputClass} pl-8`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={refresh} aria-label="Refrescar">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo repartidor
            </Button>
          </div>
        </div>

        {error && (
          <p className="border-b border-border bg-destructive/5 px-5 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Repartidor</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Telegram</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  {loading ? "Cargando…" : "Sin repartidores registrados."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 transition hover:bg-muted/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Bike className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{r.nombre}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{r.telefono}</td>
                <td className="px-5 py-3">
                  <Badge value={r.estado} map={ESTADO_REPARTIDOR} />
                </td>
                <td className="px-5 py-3">
                  {r.telegram_chat_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <MessageCircle className="h-3.5 w-3.5" /> Configurado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Sin configurar
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => setEditTarget(r)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(r)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <RepartidorForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={refresh}
        existing={null}
      />
      <RepartidorForm
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={refresh}
        existing={editTarget}
      />
    </div>
  );
}

function RepartidorForm({
  open,
  onClose,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing: Repartidor | null;
}) {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    password: "",
    telegram_chat_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      setForm({
        nombre: existing.nombre,
        telefono: existing.telefono,
        password: "",
        telegram_chat_id: existing.telegram_chat_id ?? "",
      });
    } else {
      setForm({
        nombre: "",
        telefono: "",
        password: "",
        telegram_chat_id: "",
      });
    }
  }, [open, existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = existing ? `/api/repartidores/${existing.id}` : "/api/repartidores";
      const method = existing ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        telefono: form.telefono,
        telegram_chat_id: form.telegram_chat_id.trim() || null,
      };
      if (form.password) body.password = form.password;
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el repartidor");
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? "Editar repartidor" : "Nuevo repartidor"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre">
          <input
            className={inputClass}
            value={form.nombre}
            required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputClass}
            value={form.telefono}
            required
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </Field>
        <Field
          label={
            existing
              ? "Nueva contraseña PWA (dejar en blanco para no cambiar)"
              : "Contraseña PWA (vacío = usa el teléfono)"
          }
        >
          <input
            type="text"
            className={inputClass}
            value={form.password}
            placeholder={existing ? "••••••••" : form.telefono || "Igual al teléfono"}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Chat ID de Telegram (opcional)
          </p>
          <input
            className={inputClass}
            value={form.telegram_chat_id}
            placeholder="123456789"
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
          />
        </div>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
