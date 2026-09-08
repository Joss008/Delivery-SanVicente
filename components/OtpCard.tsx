"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtpCardProps {
  codigo: string;
  expiraEn?: string | null;
  intentos?: number;
  bloqueado?: boolean;
  alertaMotivo?: string | null;
  className?: string;
}

/**
 * Tarjeta con el código OTP del pedido. Permite copiar el código al portapapeles
 * y mostrar el QR para que el cliente lo escanee con su teléfono. El QR
 * codifica un payload JSON con `{ codigo, pedido, expira }` que podría ser
 * consumido por una app del cliente en el futuro (hoy se usa sólo como código
 * visual para que el cliente lo dicte).
 */
export function OtpCard({
  codigo,
  expiraEn,
  intentos = 0,
  bloqueado = false,
  alertaMotivo,
  className,
}: OtpCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    setQrError(false);
    const payload = JSON.stringify({
      tipo: "reparto-otp",
      codigo,
      expira: expiraEn ?? null,
    });
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 168,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => setQrError(true));
  }, [codigo, expiraEn]);

  function copiar() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codigo).then(
        () => {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        },
        () => undefined
      );
    }
  }

  const expirada =
    expiraEn != null &&
    new Date(expiraEn.replace(" ", "T") + "Z").getTime() < Date.now();

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm",
        (bloqueado || expirada) && "border-destructive/40",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Código de entrega (OTP)
        </h3>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Comparte este código con tu cliente por WhatsApp o cualquier otro canal.
        El repartidor deberá ingresarlo al momento de entregar para confirmar
        la recepción.
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-[168px] w-[168px] items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
          {qrError ? (
            <span className="text-xs text-muted-foreground">QR no disponible</span>
          ) : (
            <canvas ref={canvasRef} className="h-full w-full" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <span className="font-mono text-2xl font-bold tracking-[0.4em] text-foreground">
              {codigo}
            </span>
            <button
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
              type="button"
            >
              {copiado ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </>
              )}
            </button>
          </div>

          {expiraEn && (
            <p className="text-xs text-muted-foreground">
              Vence: <span className="font-medium text-foreground">{expiraEn}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {intentos > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <AlertTriangle className="h-3 w-3" />
                {intentos} intento{intentos === 1 ? "" : "s"} fallido
                {intentos === 1 ? "" : "s"}
              </span>
            )}
            {bloqueado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                <AlertTriangle className="h-3 w-3" />
                Bloqueado
              </span>
            )}
            {expirada && !bloqueado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
                <RefreshCw className="h-3 w-3" />
                Expirado — regenerar
              </span>
            )}
          </div>

          {alertaMotivo && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20">
              <strong>Alerta antifraude:</strong> {alertaMotivo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}