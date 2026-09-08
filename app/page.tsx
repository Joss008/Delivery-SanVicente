"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Building2,
  Clock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import MapView from "@/components/MapView";
import MapLegendCard from "@/components/MapLegendCard";
import AdminDashboard from "@/components/AdminDashboard";
import AntifraudPanel from "@/components/AntifraudPanel";
import RepartidoresAdmin from "@/components/RepartidoresAdmin";
import { Modal, Field, inputClass, Button, Card } from "@/components/ui";
import { Badge, ESTADO_REPARTIDOR, ESTADO_PEDIDO } from "@/components/badges";
import { OtpCard } from "@/components/OtpCard";
import { cn } from "@/lib/utils";
import { authFetch, clearSession, getStoredUser, getToken } from "@/lib/clientAuth";
import {
  Repartidor,
  PedidoConRepartidor,
  PedidoDetalle,
  EstadoRepartidor,
  EstadoPedido,
} from "@/lib/types";

const ESTADOS_REPARTIDOR: EstadoRepartidor[] = ["disponible", "ocupado", "inactivo"];
const ESTADOS_PEDIDO: EstadoPedido[] = ["pendiente", "asignado", "en_camino", "entregado", "disputado"];

type Tab = "mapa" | "pedidos";

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "mapa", label: "Panel", icon: LayoutDashboard },
  { key: "pedidos", label: "Pedidos", icon: Package },
];

const PAGE_META: Record<Tab, { title: string; description: string }> = {
  mapa: {
    title: "Panel de control",
    description: "Vista en tiempo real de la flota externa y tus pedidos.",
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

  return (
    <EmpresaShell
      currentUser={{
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        direccion: usuario.direccion ?? null,
      }}
    />
  );
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

type AdminTab = "empresas" | "repartidores" | "antifraude";

const ADMIN_NAV: { key: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "empresas", label: "Empresas", icon: Building2 },
  { key: "repartidores", label: "Repartidores", icon: Bike },
  { key: "antifraude", label: "Antifraude", icon: ShieldAlert },
];

const ADMIN_PAGE_META: Record<AdminTab, { title: string; description: string }> = {
  empresas: {
    title: "Administración",
    description: "Gestiona las empresas que operan en Reparto Cañete.",
  },
  repartidores: {
    title: "Repartidores externos",
    description: "Registra y administra los motorizados externos del sistema.",
  },
  antifraude: {
    title: "Antifraude",
    description: "Repartidores en observación e indicadores de intentos y reclamos.",
  },
};

function AdminShell({
  currentAdmin,
}: {
  currentAdmin: { id: number; nombre: string; email: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("empresas");
  const onLogout = useCallback(async () => {
    await authFetch("/api/auth/usuarios/logout", { method: "POST" }).catch(() => null);
    clearSession();
    router.replace("/login");
  }, [router]);

  const meta = ADMIN_PAGE_META[tab];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ShellHeader
        title={meta.title}
        description={meta.description}
        currentUser={{ ...currentAdmin, rolLabel: "Administrador" }}
        onLogout={onLogout}
      />
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 lg:px-8">
          {ADMIN_NAV.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        {tab === "empresas" && <AdminDashboard currentAdmin={currentAdmin} />}
        {tab === "repartidores" && <RepartidoresAdmin />}
        {tab === "antifraude" && <AntifraudPanel />}
      </main>
    </div>
  );
}

function EmpresaShell({
  currentUser,
}: {
  currentUser: { id: number; nombre: string; email: string; direccion?: string | null };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mapa");
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoConRepartidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [localDireccion, setLocalDireccion] = useState<string | null>(currentUser.direccion ?? null);

  const [pedCreateOpen, setPedCreateOpen] = useState(false);
  const [pedEdit, setPedEdit] = useState<PedidoConRepartidor | null>(null);
  const [pedCreated, setPedCreated] = useState<PedidoConRepartidor | null>(null);
  const [pedDetalleOtp, setPedDetalleOtp] = useState<PedidoConRepartidor | null>(null);
  const [pedDetalleReclamo, setPedDetalleReclamo] = useState<PedidoConRepartidor | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes, meRes] = await Promise.all([
        authFetch("/api/repartidores"),
        authFetch("/api/pedidos"),
        authFetch("/api/auth/usuarios/me").catch(() => null),
      ]);

      const r = rRes.ok ? await rRes.json().catch(() => []) : [];
      const p = pRes.ok ? await pRes.json().catch(() => []) : [];
      const me = meRes && meRes.ok ? await meRes.json().catch(() => null) : null;

      setRepartidores(Array.isArray(r) ? r : []);
      setPedidos(Array.isArray(p) ? p : []);
      if (me?.usuario?.direccion !== undefined) {
        setLocalDireccion(me.usuario.direccion ?? null);
      }
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
  // Mostramos en el minimapa a todo repartidor con GPS activo y sesión
  // reciente, sin importar si aceptó o no un pedido de esta empresa. Esto
  // permite ver la flota en tiempo real y verificar el flujo de envío de
  // ubicación desde la PWA sin necesidad de tener un pedido aceptado.
  const repartidoresEnMapa = repartidores.filter(
    (r) => r.ubicacion_recibida_en && r.estado !== "inactivo"
  );
  const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente");
  const pedidosEnCamino = pedidos.filter((p) => p.estado === "en_camino");
  const pedidosEntregados = pedidos.filter((p) => p.estado === "entregado");

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
            const count = key === "pedidos" ? pedidos.length : null;
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
                <StatCard
                  label="Pedidos entregados"
                  value={pedidosEntregados.length}
                  icon={Package}
                  tone="bg-emerald-50 text-emerald-600"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <Card className="flex h-[480px] flex-col overflow-hidden p-0">
                  <MapView repartidores={repartidoresEnMapa} pedidos={pedidos} />
                </Card>

                <div className="space-y-6">
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

                  <MapLegendCard />
                </div>
              </div>
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
                      <th className="px-5 py-3 font-medium">Verificación</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                          Aún no tienes pedidos. Crea el primero desde "Nuevo pedido".
                        </td>
                      </tr>
                    )}
                    {pedidos.map((p) => {
                      const bloqueadoPorIntentos = (p.otp_intentos ?? 0) >= 3;
                      const expirado =
                        p.otp_expira_en != null &&
                        new Date(p.otp_expira_en.replace(" ", "T") + "Z").getTime() < Date.now();
                      const sospechoso = !!p.alerta_motivo;
                      const mostrarOtp =
                        p.otp_codigo && p.estado !== "entregado" && p.estado !== "disputado";
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 transition hover:bg-muted/40"
                        >
                          <td className="px-5 py-3 font-medium text-foreground">{p.codigo}</td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {p.direccion_recojo} → {p.direccion_entrega}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {p.repartidor_nombre ?? "Sin asignar"}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge value={p.estado} map={ESTADO_PEDIDO} />
                              {p.reclamado_en && (
                                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                  <ShieldAlert className="h-3 w-3" /> Reclamado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1">
                              {mostrarOtp ? (
                                <button
                                  onClick={() => setPedDetalleOtp(p)}
                                  className="inline-flex w-fit items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                                  type="button"
                                >
                                  <KeyRound className="h-3 w-3" /> Ver código
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {p.otp_validado_en ? `OK · ${p.otp_validado_en}` : "—"}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {bloqueadoPorIntentos && (
                                  <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                    Bloqueado
                                  </span>
                                )}
                                {expirado && !bloqueadoPorIntentos && mostrarOtp && (
                                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
                                    Expirado
                                  </span>
                                )}
                                {sospechoso && (
                                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                    Alerta
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              {p.estado === "entregado" && !p.reclamado_en && (
                                <Button
                                  variant="outline"
                                  onClick={() => setPedDetalleReclamo(p)}
                                >
                                  No recibí
                                </Button>
                              )}
                              <Button variant="ghost" onClick={() => setPedEdit(p)} aria-label="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" onClick={() => handleDeletePedido(p.id)} aria-label="Eliminar">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </main>
      </div>

      <PedidoForm
        open={pedCreateOpen}
        onClose={() => setPedCreateOpen(false)}
        onSaved={refresh}
        onCreated={(p) => setPedCreated(p)}
        existing={null}
        repartidores={repartidores}
        localDireccion={localDireccion}
      />
      <PedidoForm
        open={!!pedEdit}
        onClose={() => setPedEdit(null)}
        onSaved={refresh}
        onCreated={undefined}
        existing={pedEdit}
        repartidores={repartidores}
        localDireccion={localDireccion}
      />

      <Modal
        title={`Pedido creado · ${pedCreated?.codigo ?? ""}`}
        open={!!pedCreated}
        onClose={() => setPedCreated(null)}
      >
        {pedCreated && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Guarda el código de verificación y compártelo con tu cliente. El
              repartidor deberá ingresarlo al momento de entregar el pedido.
            </p>
            <OtpCard
              codigo={pedCreated.otp_codigo ?? "------"}
              expiraEn={pedCreated.otp_expira_en}
              intentos={pedCreated.otp_intentos ?? 0}
            />
            <div className="flex justify-end">
              <Button onClick={() => setPedCreated(null)}>Entendido</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={`Código de verificación · ${pedDetalleOtp?.codigo ?? ""}`}
        open={!!pedDetalleOtp}
        onClose={() => setPedDetalleOtp(null)}
      >
        {pedDetalleOtp && (
          <OtpCard
            codigo={pedDetalleOtp.otp_codigo ?? "------"}
            expiraEn={pedDetalleOtp.otp_expira_en}
            intentos={pedDetalleOtp.otp_intentos ?? 0}
            alertaMotivo={pedDetalleOtp.alerta_motivo}
          />
        )}
      </Modal>

      <ReclamoModal
        pedido={pedDetalleReclamo}
        onClose={() => setPedDetalleReclamo(null)}
        onSent={async () => {
          setPedDetalleReclamo(null);
          await refresh();
        }}
      />
    </div>
  );

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

function PedidoForm({
  open,
  onClose,
  onSaved,
  onCreated,
  existing,
  repartidores,
  localDireccion,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onCreated?: ((p: PedidoConRepartidor) => void) | undefined;
  existing: PedidoConRepartidor | null;
  repartidores: Repartidor[];
  localDireccion?: string | null;
}) {
  const [form, setForm] = useState({
    direccion_entrega: "",
    observaciones: "",
    estado: "pendiente",
    repartidor_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      setForm({
        direccion_entrega: existing.direccion_entrega,
        observaciones: existing.observaciones ?? "",
        estado: existing.estado,
        repartidor_id: existing.repartidor_id ? String(existing.repartidor_id) : "",
      });
    } else {
      setForm({
        direccion_entrega: "",
        observaciones: "",
        estado: "pendiente",
        repartidor_id: "",
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
          direccion_entrega: form.direccion_entrega,
          observaciones: form.observaciones || null,
          estado: form.estado,
          repartidor_id: form.repartidor_id ? Number(form.repartidor_id) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el pedido");
        return;
      }
      const nuevoPedido = data as PedidoConRepartidor;
      onClose();
      if (!existing && onCreated && nuevoPedido.otp_codigo) {
        onCreated(nuevoPedido);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? "Editar pedido" : "Nuevo pedido"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {existing && existing.otp_codigo && existing.estado !== "entregado" && existing.estado !== "disputado" && (
          <OtpCard
            codigo={existing.otp_codigo}
            expiraEn={existing.otp_expira_en}
            intentos={existing.otp_intentos ?? 0}
          />
        )}
        {!existing && (
          <>
            <Field label="Dirección del negocio (recojo)">
              <input
                className={cn(inputClass, "bg-muted/40 cursor-not-allowed")}
                value={localDireccion ?? ""}
                readOnly
                placeholder={localDireccion ? undefined : "Sin dirección registrada"}
              />
            </Field>
            {!localDireccion && (
              <p className="-mt-2 text-xs text-destructive">
                Aún no registras la dirección de tu negocio. Pídele al administrador que la configure
                antes de crear pedidos.
              </p>
            )}
          </>
        )}
        {existing && (
          <Field label="Dirección del negocio (recojo)">
            <input
              className={cn(inputClass, "bg-muted/40 cursor-not-allowed")}
              value={existing.direccion_recojo}
              readOnly
            />
          </Field>
        )}
        <Field label="Dirección de entrega">
          <input className={inputClass} value={form.direccion_entrega} required onChange={(e) => setForm({ ...form, direccion_entrega: e.target.value })} />
        </Field>
        <Field label="Observaciones (opcional)">
          <textarea className={inputClass} value={form.observaciones} rows={2} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </Field>
        {existing && (
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
        )}
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

function ReclamoModal({
  pedido,
  onClose,
  onSent,
}: {
  pedido: PedidoConRepartidor | null;
  onClose: () => void;
  onSent: () => void | Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pedido) {
      setMotivo("");
      setError(null);
    }
  }, [pedido]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/api/pedidos/${pedido.id}/reclamar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo abrir la disputa");
        return;
      }
      await onSent();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Reclamo · ${pedido?.codigo ?? ""}`} open={!!pedido} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Indícale al equipo qué pasó. Esto abrirá una disputa y el pedido pasará a estado "En disputa" para que el administrador lo revise.
        </p>
        <Field label="Motivo del reclamo">
          <textarea
            className={inputClass}
            value={motivo}
            rows={3}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. el cliente dice que nunca recibió el pedido..."
          />
        </Field>
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
            {saving ? "Enviando…" : "Abrir disputa"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
