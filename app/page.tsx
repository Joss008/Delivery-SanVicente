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
  Wallet,
} from "lucide-react";
import MapView from "@/components/MapView";
import MapLegendCard from "@/components/MapLegendCard";
import AdminDashboard from "@/components/AdminDashboard";
import AntifraudPanel from "@/components/AntifraudPanel";
import RepartidoresAdmin from "@/components/RepartidoresAdmin";
import Dock from "@/components/Dock";
import { Modal, Field, inputClass, Button, Card, ConfirmDialog } from "@/components/ui";
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

  const adminItems = [
    {
      icon: <Building2 size={18} />,
      label: "Empresas",
      onClick: () => setTab("empresas"),
    },
    {
      icon: <Bike size={18} />,
      label: "Repartidores",
      onClick: () => setTab("repartidores"),
    },
    {
      icon: <ShieldAlert size={18} />,
      label: "Antifraude",
      onClick: () => setTab("antifraude"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ShellHeader
        title={meta.title}
        description={meta.description}
        currentUser={{ ...currentAdmin, rolLabel: "Administrador" }}
        onLogout={onLogout}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-auto px-6 py-8 pb-24 lg:px-8">
        {tab === "empresas" && <AdminDashboard currentAdmin={currentAdmin} />}
        {tab === "repartidores" && <RepartidoresAdmin />}
        {tab === "antifraude" && <AntifraudPanel />}
      </main>
      <Dock items={adminItems} panelHeight={68} baseItemSize={50} magnification={70} />
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
  const [pedDeleteTarget, setPedDeleteTarget] = useState<PedidoConRepartidor | null>(null);
  const [pedDeleting, setPedDeleting] = useState(false);
  const [pedDeleteError, setPedDeleteError] = useState<string | null>(null);

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

  const empresaItems = [
    {
      icon: <LayoutDashboard size={18} />,
      label: "Panel",
      onClick: () => setTab("mapa"),
      badge: null,
    },
    {
      icon: <Package size={18} />,
      label: `Pedidos${pedidos.length > 0 ? ` (${pedidos.length})` : ""}`,
      onClick: () => setTab("pedidos"),
      badge: pedidos.length,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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

      <main className="flex-1 overflow-auto p-6 pb-24 lg:p-8">
          {tab === "mapa" && (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="h-[calc(100vh-16rem)] min-h-[380px]">
                    <MapView repartidores={repartidoresEnMapa} pedidos={pedidos} />
                  </div>

                  <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none text-foreground">{pedidosPendientes.length}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">Pendientes</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none text-foreground">{pedidosEnCamino.length}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">En camino</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                        <Package className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none text-foreground">{pedidosEntregados.length}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">Entregados</p>
                      </div>
                    </div>
                  </div>

                  <MapLegendCard />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pedidos pendientes
                      </h3>
                      {pedidosPendientes.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                          {pedidosPendientes.length}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {pedidosPendientes.length === 0 && (
                        <li className="py-6 text-center text-xs text-muted-foreground">
                          Sin pedidos pendientes
                        </li>
                      )}
                      {pedidosPendientes.map((p) => (
                        <li
                          key={p.id}
                          className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-muted/40"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p.codigo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.direccion_entrega}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {repartidoresEnMapa.length > 0 && (
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Repartidores activos
                      </h3>
                      <ul className="space-y-2">
                        {repartidoresEnMapa.slice(0, 5).map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center gap-3 rounded-xl px-3 py-2"
                          >
                            <div className="relative">
                              <div
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white",
                                  r.estado === "disponible"
                                    ? "bg-emerald-500"
                                    : r.estado === "ocupado"
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                                )}
                              >
                                {initials(r.nombre)}
                              </div>
                              {r.ubicacion_recibida_en && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {r.nombre}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.estado === "disponible"
                                  ? "Disponible"
                                  : r.estado === "ocupado"
                                    ? "En ruta"
                                    : "Inactivo"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                      <th className="px-5 py-3 font-medium">Pago</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium">Verificación</th>
                      <th className="px-5 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <Wallet className="h-3 w-3" />
                              S/ {Number(p.pago_repartidor ?? 0).toFixed(2)}
                            </span>
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
                              <Button variant="ghost" onClick={() => setPedDeleteTarget(p)} aria-label="Eliminar">
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

        <Dock items={empresaItems} panelHeight={68} baseItemSize={50} magnification={70} />

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
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Wallet className="h-4 w-4" />
              <span>
                Pago al repartidor:{" "}
                <strong>S/ {Number(pedCreated.pago_repartidor ?? 0).toFixed(2)}</strong>
              </span>
            </div>
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

      <ConfirmDialog
        open={!!pedDeleteTarget}
        title="Eliminar pedido"
        description="Esta acción no se puede deshacer. Se notificará al repartidor si ya estaba asignado."
        confirmLabel="Eliminar pedido"
        loading={pedDeleting}
        error={pedDeleteError}
        onConfirm={confirmDeletePedido}
        onClose={closeDeletePedido}
        details={
          pedDeleteTarget && (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold tracking-tight text-foreground">
                  {pedDeleteTarget.codigo}
                </span>
                <Badge value={pedDeleteTarget.estado} map={ESTADO_PEDIDO} />
              </div>
              <p className="text-sm font-medium text-foreground">{pedDeleteTarget.empresa}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {pedDeleteTarget.direccion_recojo} → {pedDeleteTarget.direccion_entrega}
              </p>
            </div>
          )
        }
      />
    </div>
  );

  function closeDeletePedido() {
    if (pedDeleting) return;
    setPedDeleteTarget(null);
    setPedDeleteError(null);
  }

  async function confirmDeletePedido() {
    if (!pedDeleteTarget) return;
    setPedDeleting(true);
    setPedDeleteError(null);
    try {
      const res = await authFetch(`/api/pedidos/${pedDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPedDeleteError(data.error ?? "No se pudo eliminar el pedido");
        return;
      }
      setPedDeleteTarget(null);
      refresh();
    } finally {
      setPedDeleting(false);
    }
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
  const colors = tone.includes("amber")
    ? { bg: "from-amber-500 to-orange-400", ring: "bg-amber-500/10", icon: "text-amber-600" }
    : tone.includes("blue")
      ? { bg: "from-blue-500 to-cyan-400", ring: "bg-blue-500/10", icon: "text-blue-600" }
      : { bg: "from-emerald-500 to-teal-400", ring: "bg-emerald-500/10", icon: "text-emerald-600" };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] bg-gradient-to-br", colors.bg)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", colors.ring)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
      </div>
    </div>
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
    pago_repartidor: "",
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
        pago_repartidor:
          typeof existing.pago_repartidor === "number"
            ? String(existing.pago_repartidor)
            : "",
      });
    } else {
      setForm({
        direccion_entrega: "",
        observaciones: "",
        estado: "pendiente",
        repartidor_id: "",
        pago_repartidor: "",
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
          pago_repartidor:
            form.pago_repartidor.trim() === ""
              ? 0
              : Number(form.pago_repartidor),
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
        <Field label="Pago al repartidor (S/)">
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(inputClass, "pl-8 pr-12")}
              type="number"
              inputMode="decimal"
              step="0.10"
              min="0"
              placeholder="0.00"
              value={form.pago_repartidor}
              onChange={(e) =>
                setForm({ ...form, pago_repartidor: e.target.value })
              }
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              S/
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Monto que recibirá el repartidor al entregar este pedido. Se mostrará en la PWA antes de aceptar.
          </p>
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
