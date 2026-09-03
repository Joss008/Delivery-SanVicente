import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Completa los campos para guardar el registro.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline:
      "border border-input bg-white text-foreground hover:bg-muted",
    danger:
      "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    ghost:
      "text-muted-foreground hover:bg-muted hover:text-foreground",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      {children}
    </div>
  );
}
