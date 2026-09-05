"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Clock,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import MapView from "@/components/MapView";
import AdminDashboard from "@/components/AdminDashboard";
import { Modal, Field, inputClass, Button, Card } from "@/components/ui";
import { Badge, ESTADO_REPARTIDOR, ESTADO_PEDIDO } from "@/components/badges";
import { cn } from "@/lib/utils";
import { authFetch, clearSession, getStoredUser, getToken } from "@/lib/clientAuth";
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

export default function HomeShell() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [usuario, setUsuario] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace("/login");
      return;
    }
    setUsuario(stored);
    setReady(true);
  }, [router]);

  if (!ready || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (usuario.rol_id === 1) {
    return (
      <AdminShell currentAdmin={{ id: usuario.id, nombre: usuario.nombre, email: usuario.email }} />
    );
  }

  return <EmpresaShell currentUser={{ id: usuario.id, nombre: usuario.nombre, email: usuario.email }} />;
}

function ShellHeader({
  title,
  description,
  right,
  currentUser,
  onLogout,
}: {
  title: string;
  description: string;
  right?: React.ReactNode;
  currentUser: { nombre: string; email: string; rolLabel: string };
  onLogout: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-card px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {right}
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {initials(currentUser.nombre)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium text-foreground">{currentUser.nombre}</p>
            <p className="truncate text-[11px] text-muted-foreground">{currentUser.rolLabel}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>
    </header>
  );
}

function AdminShell({
  currentAdmin,
}: {
  currentAdmin: { id: number; nombre: string; email: string };
}) {
  const router = useRouter();
  const onLogout = useCallback(async () => {
    await authFetch("/api/auth/usuarios/logout", { method: "POST" }).catch(() => null);
    clearSession();
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ShellHeader
        title="Administración"
        description="Gestiona las empresas que operan en Reparto Cañete."
        currentUser={{ ...currentAdmin, rolLabel: "Administrador" }}
        onLogout={onLogout}
      />
      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <AdminDashboard currentAdmin={currentAdmin} />
      </main>
    </div>
  );
}

function EmpresaShell({
  currentUser,
}: {
  currentUser: { id: number; nombre: string; email: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mapa");
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoConRepartidor[]>([]);
  const [loading, setLoading] = useState(false);

  const [repCreateOpen, setRepCreateOpen] = useState(false);
  const [repEdit, setRepEdit] = useState<Repartidor | null>(null);

  const [pedCreateOpen, setPedCreateOpen] = useState(false);
  const [pedEdit, setPedEdit] = useState<PedidoConRepartidor | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        authFetch("/api/repartidores").then((res) => res.json()),
        authFetch("/api/pedidos").then((res) => res.json()),
      ]);
      setRepartidores(Array.isArray(r) ? r : []);
      setPedidos(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const onLogout = useCallback(async () => {
    await authFetch("/api/auth/usuarios/logout", { method: "POST" }).catch(() => null);
    clearSession();
    router.replace("/login");
  }, [router]);

  const meta = PAGE_META[tab];
  const repartidoresActivos = repartidores.filter((r) => r.estado !== "inactivo");
  const repartidoresEnMapa = repartidores.filter((r) => r.ubicacion_recibida_en);
  const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente");
  const pedidosEnCamino = pedidos.filter((p) => p.estado === "en_camino");

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Reparto Cañete</p>
            <p className="truncate text-xs text-muted-foreground">{currentUser.nombre}</p>
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
        <ShellHeader
          title={meta.title}
          description={meta.description}
          currentUser={{ ...currentUser, rolLabel: "Empresa" }}
          onLogout={onLogout}
          right={
            <>
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
            </>
          }
        />

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
                <Card className="flex h-[480px] flex-col overflow-hidden p-0">
                  <MapView repartidores={repartidoresEnMapa} pedidos={pedidos} />
                </Card>

                <div className="space-y-6">
                  <Card className="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                      Repartidores activos
                    </h3>
                    <ul className="space-y-3">
                      {repartidoresActivos.length === 0 && (
                        <li className="text-sm text-muted-foreground">Sin repartidores activos.</li>
                      )}
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
                      {pedidosPendientes.length === 0 && (
                        <li className="text-sm text-muted-foreground">Sin pedidos pendientes.</li>
                      )}
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
                              {p.empresa} · {p.direccion_entrega}
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
                      <th className="px-5 py-3 font-medium">Telegram</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repartidores.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                          Aún no tienes repartidores. Crea el primero desde "Nuevo repartidor".
                        </td>
                      </tr>
                    )}
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
                          {r.telegram_chat_id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <MessageCircle className="h-3.5 w-3.5" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              Sin configurar
                            </span>
                          )}
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
                      <th className="px-5 py-3 font-medium">Recojo → Entrega</th>
                      <th className="px-5 py-3 font-medium">Motorizado</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                          Aún no tienes pedidos. Crea el primero desde "Nuevo pedido".
                        </td>
                      </tr>
                    )}
                    {pedidos.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 transition hover:bg-muted/40">
                        <td className="px-5 py-3 font-medium text-foreground">{p.codigo}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {p.direccion_recojo} → {p.direccion_entrega}
                        </td>
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
    const res = await authFetch(`/api/repartidores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar el repartidor");
      return;
    }
    refresh();
  }

  async function handleDeletePedido(id: number) {
    if (!confirm("¿Eliminar este pedido?")) return;
    const res = await authFetch(`/api/pedidos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar el pedido");
      return;
    }
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
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    password: "",
    estado: "disponible",
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
        estado: existing.estado,
        telegram_chat_id: existing.telegram_chat_id ?? "",
      });
    } else {
      setForm({
        nombre: "",
        telefono: "",
        password: "",
        estado: "disponible",
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
        estado: form.estado,
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
          <input className={inputClass} value={form.nombre} required onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <input className={inputClass} value={form.telefono} required onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </Field>
        <Field label={existing ? "Contraseña PWA (dejar en blanco para no cambiar)" : "Contraseña PWA (vacío = usa el teléfono)"}>
          <input
            type="text"
            className={inputClass}
            value={form.password}
            placeholder={existing ? "••••••••" : form.telefono || "Igual al teléfono"}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            {ESTADOS_REPARTIDOR.map((s) => (
              <option key={s} value={s}>{ESTADO_REPARTIDOR[s].label}</option>
            ))}
          </select>
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> Chat ID de Telegram (opcional)
            </span>
          }
        >
          <input
            className={inputClass}
            value={form.telegram_chat_id}
            placeholder="123456789"
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
          />
        </Field>
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Con un chat_id configurado, este repartidor recibirá alertas push por
          Telegram cada vez que se le asigne o aparezca un pedido disponible.
          Pídele al repartidor que escriba <code className="font-mono">/start</code>{" "}
          al bot y te comparta el ID (lo entrega @userinfobot o cualquier bot que
          devuelva su identificador).
        </p>
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          La ubicación del repartidor la proporciona únicamente la PWA cuando inicia
          sesión y reporta su GPS. No es posible asignar coordenadas manualmente.
        </p>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
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
    direccion_recojo: "",
    direccion_entrega: "",
    observaciones: "",
    estado: "pendiente",
    repartidor_id: "",
    lat: -13.0833,
    lng: -76.3833,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      setForm({
        codigo: existing.codigo,
        direccion_recojo: existing.direccion_recojo,
        direccion_entrega: existing.direccion_entrega,
        observaciones: existing.observaciones ?? "",
        estado: existing.estado,
        repartidor_id: existing.repartidor_id ? String(existing.repartidor_id) : "",
        lat: existing.lat,
        lng: existing.lng,
      });
    } else {
      setForm({
        codigo: "",
        direccion_recojo: "",
        direccion_entrega: "",
        observaciones: "",
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
    setError(null);
    try {
      const url = existing ? `/api/pedidos/${existing.id}` : "/api/pedidos";
      const method = existing ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          observaciones: form.observaciones || null,
          repartidor_id: form.repartidor_id ? Number(form.repartidor_id) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el pedido");
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? "Editar pedido" : "Nuevo pedido"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Código de pedido">
          <input className={inputClass} value={form.codigo} required placeholder="PED-0001" onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        </Field>
        <Field label="Dirección de recojo">
          <input className={inputClass} value={form.direccion_recojo} required onChange={(e) => setForm({ ...form, direccion_recojo: e.target.value })} />
        </Field>
        <Field label="Dirección de entrega">
          <input className={inputClass} value={form.direccion_entrega} required onChange={(e) => setForm({ ...form, direccion_entrega: e.target.value })} />
        </Field>
        <Field label="Observaciones (opcional)">
          <textarea className={inputClass} value={form.observaciones} rows={2} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
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
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
