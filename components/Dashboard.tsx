"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  Clock,
  LayoutDashboard,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import MapView from "@/components/MapView";
import { Modal, Field, inputClass, Button, Card } from "@/components/ui";
import { Badge, ESTADO_REPARTIDOR, ESTADO_PEDIDO } from "@/components/badges";
import { cn } from "@/lib/utils";
import {
  Repartidor,
  PedidoConRepartidor,
  EstadoRepartidor,
  EstadoPedido,
} from "@/lib/types";

const ESTADOS_REPARTIDOR: EstadoRepartidor[] = ["disponible", "ocupado", "inactivo"];
const ESTADOS_PEDIDO: EstadoPedido[] = ["pendiente", "asignado", "en_camino", "entregado"];

type Tab = "mapa" | "repartidores" | "pedidos";

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "mapa", label: "Panel", icon: LayoutDashboard },
  { key: "repartidores", label: "Repartidores", icon: Bike },
  { key: "pedidos", label: "Pedidos", icon: Package },
];

const PAGE_META: Record<Tab, { title: string; description: string }> = {
  mapa: {
    title: "Panel de control",
    description: "Vista en tiempo real de tu flota y pedidos.",
  },
  repartidores: {
    title: "Repartidores",
    description: "Gestiona tu equipo de reparto y su disponibilidad.",
  },
  pedidos: {
    title: "Pedidos",
    description: "Administra las entregas y su estado.",
  },
};

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

  const meta = PAGE_META[tab];
  const repartidoresActivos = repartidores.filter((r) => r.estado !== "inactivo");
  const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente");
  const pedidosEnCamino = pedidos.filter((p) => p.estado === "en_camino");

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Reparto Cañete</p>
            <p className="text-xs text-muted-foreground">Gestión de entregas</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            const count =
              key === "repartidores"
                ? repartidores.length
                : key === "pedidos"
                ? pedidos.length
                : null;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {count !== null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Actualización cada 15 s
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </Button>
            {tab === "repartidores" && (
              <Button onClick={() => setRepCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo repartidor
              </Button>
            )}
            {tab === "pedidos" && (
              <Button onClick={() => setPedCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo pedido
              </Button>
            )}
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 md:hidden">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {tab === "mapa" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Repartidores activos"
                  value={repartidoresActivos.length}
                  icon={Users}
                  tone="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                  label="Pedidos pendientes"
                  value={pedidosPendientes.length}
                  icon={Clock}
                  tone="bg-amber-50 text-amber-600"
                />
                <StatCard
                  label="En camino"
                  value={pedidosEnCamino.length}
                  icon={TrendingUp}
                  tone="bg-blue-50 text-blue-600"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <Card className="min-h-[480px] overflow-hidden p-0">
                  <MapView repartidores={repartidores} pedidos={pedidos} />
                </Card>

                <div className="space-y-6">
                  <Card className="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                      Repartidores activos
                    </h3>
                    <ul className="space-y-3">
                      {repartidoresActivos.map((r) => (
                        <li key={r.id} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {initials(r.nombre)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {r.nombre}
                          </span>
                          <Badge value={r.estado} map={ESTADO_REPARTIDOR} />
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card className="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                      Pedidos pendientes
                    </h3>
                    <ul className="space-y-3">
                      {pedidosPendientes.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {p.codigo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.descripcion}
                            </p>
                          </div>
                          <Badge value={p.estado} map={ESTADO_PEDIDO} />
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {tab === "repartidores" && (
            <div className="space-y-5">
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Repartidor</th>
                      <th className="px-5 py-3 font-medium">Teléfono</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repartidores.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 transition hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                              {initials(r.nombre)}
                            </span>
                            <span className="font-medium text-foreground">{r.nombre}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{r.telefono}</td>
                        <td className="px-5 py-3">
                          <Badge value={r.estado} map={ESTADO_REPARTIDOR} />
                        </td>
                        <td className="px-5 py-3">
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
              </Card>
            </div>
          )}

          {tab === "pedidos" && (
            <div className="space-y-5">
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Código</th>
                      <th className="px-5 py-3 font-medium">Descripción</th>
                      <th className="px-5 py-3 font-medium">Motorizado</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 transition hover:bg-muted/40">
                        <td className="px-5 py-3 font-medium text-foreground">{p.codigo}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.descripcion}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.repartidor_nombre ?? "Sin asignar"}</td>
                        <td className="px-5 py-3">
                          <Badge value={p.estado} map={ESTADO_PEDIDO} />
                        </td>
                        <td className="px-5 py-3">
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
              </Card>
            </div>
          )}
        </main>
      </div>

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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
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
    codigo: "",
    descripcion: "",
    estado: "pendiente",
    repartidor_id: "",
    lat: -13.0833,
    lng: -76.3833,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && existing) {
      setForm({
        codigo: existing.codigo,
        descripcion: existing.descripcion,
        estado: existing.estado,
        repartidor_id: existing.repartidor_id ? String(existing.repartidor_id) : "",
        lat: existing.lat,
        lng: existing.lng,
      });
    } else if (open) {
      setForm({
        codigo: "",
        descripcion: "",
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
        <Field label="Código de pedido">
          <input className={inputClass} value={form.codigo} required placeholder="PED-0001" onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <textarea className={inputClass} value={form.descripcion} required rows={3} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Motorizado">
            <select className={inputClass} value={form.repartidor_id} onChange={(e) => setForm({ ...form, repartidor_id: e.target.value })}>
              <option value="">Sin asignar</option>
              {repartidores.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS_PEDIDO.map((s) => (
                <option key={s} value={s}>{ESTADO_PEDIDO[s].label}</option>
              ))}
            </select>
          </Field>
        </div>
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
