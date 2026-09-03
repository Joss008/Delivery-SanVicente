import { cn } from "@/lib/utils";

export const ESTADO_REPARTIDOR: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  ocupado: { label: "Ocupado", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  inactivo: { label: "Inactivo", color: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

export const ESTADO_PEDIDO: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  asignado: { label: "Asignado", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  en_camino: { label: "En camino", color: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  entregado: { label: "Entregado", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};

export function Badge({
  value,
  map,
  className,
}: {
  value: string;
  map: Record<string, { label: string; color: string }>;
  className?: string;
}) {
  const item = map[value] ?? {
    label: value,
    color: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        item.color,
        className
      )}
    >
      {item.label}
    </span>
  );
}
