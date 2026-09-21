import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2, Trash2, X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
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
        <div className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: React.ReactNode;
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
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
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
  const sizes: Record<string, string> = {
    sm: "rounded-md px-2.5 py-1 text-xs gap-1",
    md: "rounded-md px-3 py-2 text-sm gap-1.5",
    lg: "rounded-md px-6 py-3 text-base gap-2",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
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

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  details?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card shadow-2xl animate-zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h3
              id="confirm-dialog-title"
              className="text-lg font-bold leading-tight text-foreground"
            >
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ml-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {details && <div className="px-5">{details}</div>}

        {error && (
          <p className="mx-5 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 p-5 pt-3 sm:flex-row">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="lg"
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : confirmVariant === "danger" ? (
              <Trash2 className="h-5 w-5" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {loading ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}