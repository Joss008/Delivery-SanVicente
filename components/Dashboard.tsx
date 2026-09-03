"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Package, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import MapView from "@/components/MapView";
import { Modal, Field, inputClass, Button } from "@/components/ui";
import { Badge, ESTADO_REPARTIDOR, ESTADO_PEDIDO } from "@/components/badges";
import { Repartidor, PedidoConRepartidor, EstadoRepartidor, EstadoPedido } from "@/lib/types";

const ESTADOS_REPARTIDOR: EstadoRepartidor[] = ["disponible", "ocupado", "inactivo"];
const ESTADOS_PEDIDO: EstadoPedido[] = ["pendiente", "asignado", "en_camino", "entregado"];

type Tab = "mapa" | "repartidores" | "pedidos";

export default function Dashboard({
  initialRepartidores,
  initialPedidos,
}: {
  initialRepartidores: Repartidor[];
  initialPedidos: PedidoConRepartidor[];
}) {
  const [tab, setTab] = useState<Tab>("mapa");
  const [repartidores, setRepartidores] = useState<Repartidor[]>(initialRepartidores);
  const [pedidos, setPedidos] = useState<PedidoConRepartidor[]>(initialPedidos);
  const [loading, setLoading] = useState(false);

  const [repCreateOpen, setRepCreateOpen] = useState(false);
  const [repEdit, setRepEdit] = useState<Repartidor | null>(null);

  const [pedCreateOpen, setPedCreateOpen] = useState(false);
  const [pedEdit, setPedEdit] = useState<PedidoConRepartidor | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        fetch("/api/repartidores").then((res) => res.json()),
        fetch("/api/pedidos").then((res) => res.json()),
      ]);
      setRepartidores(r);
      setPedidos(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Reparto Cañete</h1>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      <nav className="flex gap-1 border-b border-border bg-card px-6">
        {(
          [
            ["mapa", "Mapa"],
            ["repartidores", "Repartidores"],
            ["pedidos", "Pedidos"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto p-6">
        {tab === "mapa" && (
          <div className="grid h-full gap-4 lg:grid-cols-[1fr_320px]">
            <div className="h-full min-h-[420px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <MapView repartidores={repartidores} pedidos={pedidos} />
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Repartidores activos</h3>
                <ul className="space-y-2.5">
                  {repartidores
                    .filter((r) => r.estado !== "inactivo")
                    .map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{r.nombre}</span>
                        <Badge value={r.estado} map={ESTADO_REPARTIDOR} />
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Pedidos pendientes</h3>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {pedidos.filter((p) => p.estado === "pendiente").length}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "repartidores" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Repartidores</h2>
              <Button onClick={() => setRepCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo repartidor
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {repartidores.map((r) => (
                    <tr key={r.id} className="border-t border-border transition hover:bg-muted/40">
                      <td className="px-4 py-3 text-foreground">{r.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.telefono}</td>
                      <td className="px-4 py-3">
                        <Badge value={r.estado} map={ESTADO_REPARTIDOR} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" onClick={() => setRepEdit(r)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => handleDeleteRepartidor(r.id)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "pedidos" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Pedidos</h2>
              <Button onClick={() => setPedCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo pedido
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Dirección</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Repartidor</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <tr key={p.id} className="border-t border-border transition hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground">{p.id}</td>
                      <td className="px-4 py-3 text-foreground">{p.cliente}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.direccion}</td>
                      <td className="px-4 py-3 text-foreground">S/ {Number(p.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.repartidor_nombre ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge value={p.estado} map={ESTADO_PEDIDO} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" onClick={() => setPedEdit(p)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => handleDeletePedido(p.id)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <RepartidorForm
        open={repCreateOpen}
        onClose={() => setRepCreateOpen(false)}
        onSaved={refresh}
        existing={null}
      />
      <RepartidorForm
        open={!!repEdit}
        onClose={() => setRepEdit(null)}
        onSaved={refresh}
        existing={repEdit}
      />
      <PedidoForm
        open={pedCreateOpen}
        onClose={() => setPedCreateOpen(false)}
        onSaved={refresh}
        existing={null}
        repartidores={repartidores}
      />
      <PedidoForm
        open={!!pedEdit}
        onClose={() => setPedEdit(null)}
        onSaved={refresh}
        existing={pedEdit}
        repartidores={repartidores}
      />
    </div>
  );

  async function handleDeleteRepartidor(id: number) {
    if (!confirm("¿Eliminar este repartidor?")) return;
    await fetch(`/api/repartidores/${id}`, { method: "DELETE" });
    refresh();
  }

  async function handleDeletePedido(id: number) {
    if (!confirm("¿Eliminar este pedido?")) return;
    await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
    refresh();
  }
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
  const [form, setForm] = useState({ nombre: "", telefono: "", estado: "disponible", lat: -13.0833, lng: -76.3833 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && existing) {
      setForm({
        nombre: existing.nombre,
        telefono: existing.telefono,
        estado: existing.estado,
        lat: existing.lat,
        lng: existing.lng,
      });
    } else if (open) {
      setForm({ nombre: "", telefono: "", estado: "disponible", lat: -13.0833, lng: -76.3833 });
    }
  }, [open, existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = existing ? `/api/repartidores/${existing.id}` : "/api/repartidores";
    const method = existing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onClose();
    onSaved();
  }

  return (
    <Modal title={existing ? "Editar repartidor" : "Nuevo repartidor"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre">
          <input className={inputClass} value={form.nombre} required onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <input className={inputClass} value={form.telefono} required onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            {ESTADOS_REPARTIDOR.map((s) => (
              <option key={s} value={s}>{ESTADO_REPARTIDOR[s].label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input type="number" step="any" className={inputClass} value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
          </Field>
          <Field label="Longitud">
            <input type="number" step="any" className={inputClass} value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PedidoForm({
  open,
  onClose,
  onSaved,
  existing,
  repartidores,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing: PedidoConRepartidor | null;
  repartidores: Repartidor[];
}) {
  const [form, setForm] = useState({
    cliente: "",
    direccion: "",
    total: 0,
    estado: "pendiente",
    repartidor_id: "",
    lat: -13.0833,
    lng: -76.3833,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && existing) {
      setForm({
        cliente: existing.cliente,
        direccion: existing.direccion,
        total: existing.total,
        estado: existing.estado,
        repartidor_id: existing.repartidor_id ? String(existing.repartidor_id) : "",
        lat: existing.lat,
        lng: existing.lng,
      });
    } else if (open) {
      setForm({
        cliente: "",
        direccion: "",
        total: 0,
        estado: "pendiente",
        repartidor_id: "",
        lat: -13.0833,
        lng: -76.3833,
      });
    }
  }, [open, existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = existing ? `/api/pedidos/${existing.id}` : "/api/pedidos";
    const method = existing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        repartidor_id: form.repartidor_id ? Number(form.repartidor_id) : null,
      }),
    });
    setSaving(false);
    onClose();
    onSaved();
  }

  return (
    <Modal title={existing ? "Editar pedido" : "Nuevo pedido"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Cliente">
          <input className={inputClass} value={form.cliente} required onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <input className={inputClass} value={form.direccion} required onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total (S/)">
            <input type="number" step="any" className={inputClass} value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
          </Field>
          <Field label="Repartidor">
            <select className={inputClass} value={form.repartidor_id} onChange={(e) => setForm({ ...form, repartidor_id: e.target.value })}>
              <option value="">Sin asignar</option>
              {repartidores.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Estado">
          <select className={inputClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            {ESTADOS_PEDIDO.map((s) => (
              <option key={s} value={s}>{ESTADO_PEDIDO[s].label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input type="number" step="any" className={inputClass} value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
          </Field>
          <Field label="Longitud">
            <input type="number" step="any" className={inputClass} value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
