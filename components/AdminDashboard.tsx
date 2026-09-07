"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button, Card, Field, inputClass, Modal } from "@/components/ui";
import { Combobox } from "@/components/ui/combobox";
import { authFetch } from "@/lib/clientAuth";
import type { Usuario } from "@/lib/types";
import {
  getDepartamentos,
  getProvincias,
  getDistritos,
} from "@/lib/peru-ubigeo";

interface AdminDashboardProps {
  currentAdmin: { id: number; nombre: string; email: string };
}

export default function AdminDashboard({ currentAdmin }: AdminDashboardProps) {
  const [empresas, setEmpresas] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/usuarios");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo cargar la lista de empresas");
      }
      setEmpresas((await res.json()) as Usuario[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = empresas.filter((e) =>
    `${e.nombre} ${e.email}`.toLowerCase().includes(query.toLowerCase())
  );

  async function handleDelete(e: Usuario) {
    if (!confirm(`¿Eliminar la empresa "${e.nombre}"? Sus pedidos y repartidores también se eliminarán.`)) {
      return;
    }
    const res = await authFetch(`/api/usuarios/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar la empresa");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Empresas activas</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{empresas.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuentas con acceso al panel de gestión de pedidos y repartidores.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Sesión actual</p>
          <p className="mt-2 text-base font-semibold text-foreground">{currentAdmin.nombre}</p>
          <p className="text-xs text-muted-foreground">{currentAdmin.email} · Administrador</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Empresas registradas</h2>
            <p className="text-xs text-muted-foreground">
              Gestiona las cuentas que pueden operar pedidos y repartidores.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar empresa…"
                className={`${inputClass} pl-8`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={refresh} aria-label="Refrescar">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva empresa
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
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Alta</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  {loading ? "Cargando…" : "Sin empresas registradas."}
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 transition hover:bg-muted/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{e.nombre}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{e.email}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {e.creado_en ? new Date(e.creado_en).toLocaleDateString("es-PE") : "—"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => setEditTarget(e)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(e)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EmpresaForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={refresh}
        existing={null}
      />
      <EmpresaForm
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={refresh}
        existing={editTarget}
      />
    </div>
  );
}

function EmpresaForm({
  open,
  onClose,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing: Usuario | null;
}) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const [direccionExacta, setDireccionExacta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departamentos = getDepartamentos();
  const provincias = departamento ? getProvincias(departamento) : [];
  const distritos = departamento && provincia ? getDistritos(departamento, provincia) : [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ nombre: "", email: "", password: "" });
    setDepartamento("");
    setProvincia("");
    setDistrito("");
    setDireccionExacta("");
    if (existing) {
      setForm({
        nombre: existing.nombre,
        email: existing.email,
        password: "",
      });
      // En edición mostramos la dirección registrada como texto libre
      // (compatibilidad con datos antiguos). El usuario puede cambiarla
      // escribiendo una nueva referencia exacta.
      setDireccionExacta(existing.direccion ?? "");
    }
  }, [open, existing]);

  // Resets en cascada: cambiar departamento limpia provincia/distrito.
  useEffect(() => {
    if (!departamento) {
      setProvincia("");
      setDistrito("");
      return;
    }
    if (!provincias.includes(provincia)) {
      setProvincia("");
      setDistrito("");
    }
  }, [departamento]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!provincia) {
      setDistrito("");
      return;
    }
    if (!distritos.includes(distrito)) {
      setDistrito("");
    }
  }, [provincia]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = existing ? `/api/usuarios/${existing.id}` : "/api/usuarios";
      const method = existing ? "PUT" : "POST";

      // En creación nueva requerimos los 3 selects. En edición permitimos
      // que la dirección quede como texto libre (compat con empresas
      // registradas antes de este cambio).
      let direccionFinal = direccionExacta.trim();
      if (!existing || departamento) {
        if (!departamento || !provincia || !distrito) {
          setError("Selecciona departamento, provincia y distrito.");
          setSaving(false);
          return;
        }
        const partes = [
          direccionExacta.trim(),
          distrito,
          provincia,
          departamento,
        ].filter(Boolean);
        direccionFinal = partes.join(", ");
      }

      const body: Record<string, string> = {
        nombre: form.nombre,
        email: form.email,
        direccion: direccionFinal,
      };
      if (form.password) body.password = form.password;
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la empresa");
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? "Editar empresa" : "Nueva empresa"} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre de la empresa">
          <input
            className={inputClass}
            value={form.nombre}
            required
            placeholder="La Casa del Pollo"
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Email (login)">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            required
            placeholder="contacto@empresa.com"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        <Field
          label={
            existing
              ? "Nueva contraseña (dejar en blanco para mantener la actual)"
              : "Contraseña inicial"
          }
        >
          <input
            type="text"
            className={inputClass}
            value={form.password}
            placeholder={existing ? "••••••••" : "Mínimo 6 caracteres"}
            minLength={existing ? 0 : 6}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Ubicación del negocio (Perú)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Departamento">
              <Combobox
                value={departamento}
                onChange={setDepartamento}
                options={departamentos}
                placeholder="Selecciona…"
              />
            </Field>
            <Field label="Provincia">
              <Combobox
                value={provincia}
                onChange={setProvincia}
                options={provincias}
                placeholder="Selecciona…"
                disabled={!departamento}
              />
            </Field>
            <Field label="Distrito">
              <Combobox
                value={distrito}
                onChange={setDistrito}
                options={distritos}
                placeholder="Selecciona…"
                disabled={!provincia}
              />
            </Field>
          </div>
          <Field label="Dirección exacta (calle, avenida, número)">
            <input
              className={inputClass}
              value={direccionExacta}
              placeholder="Av. Mariscal Benavides 450"
              onChange={(e) => setDireccionExacta(e.target.value)}
            />
          </Field>
          {(departamento || provincia || distrito || direccionExacta) && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-semibold text-primary">Vista previa: </span>
              <span className="text-foreground/80">
                {[
                  direccionExacta.trim(),
                  distrito,
                  provincia,
                  departamento,
                ]
                  .filter(Boolean)
                  .join(", ") || "(vacía)"}
              </span>
            </div>
          )}
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
