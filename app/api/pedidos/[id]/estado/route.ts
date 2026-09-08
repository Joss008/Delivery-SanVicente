import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { EstadoPedido, PedidoConRepartidor } from "@/lib/types";
import {
  OTP_MAX_INTENTOS,
  acumularEntrega,
  evaluarEntrega,
  isoAhora,
  registrarEvento,
} from "@/lib/antifraude";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: [],
  asignado: ["en_camino"],
  en_camino: ["entregado"],
  entregado: [],
  disputado: [],
};

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const repartidor = getRepartidorByToken(db, bearerToken(req));
  if (!repartidor) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return withCors(NextResponse.json({ error: "ID inválido" }, { status: 400 }));
  }

  const body = await req.json();
  const nuevoEstado = String(body.estado ?? "") as EstadoPedido;
  if (!(nuevoEstado in TRANSICIONES)) {
    return withCors(NextResponse.json({ error: "Estado inválido" }, { status: 400 }));
  }

  const pedido = db
    .prepare(`${SELECT} WHERE p.id = ?`)
    .get(id) as unknown as PedidoConRepartidor | undefined;
  if (!pedido || pedido.repartidor_id !== repartidor.id || !TRANSICIONES[pedido.estado].includes(nuevoEstado)) {
    return withCors(
      NextResponse.json({ error: "No se pudo actualizar el estado" }, { status: 409 })
    );
  }

  // --- Transición a EN_CAMINO: sólo se registra timestamp de aceptación para
  //     futuras reglas antifraude (no había antes). ---
  if (nuevoEstado === "en_camino") {
    if (!pedido.aceptado_en) {
      db.prepare(
        "UPDATE pedidos SET estado = ?, aceptado_en = ?, actualizado_en = datetime('now') WHERE id = ?"
      ).run(nuevoEstado, isoAhora(), id);
      registrarEvento(db, {
        pedidoId: id,
        tipo: "en_camino",
        actorTipo: "repartidor",
        actorId: repartidor.id,
      });
    } else {
      db.prepare("UPDATE pedidos SET estado = ?, actualizado_en = datetime('now') WHERE id = ?").run(
        nuevoEstado,
        id
      );
      registrarEvento(db, {
        pedidoId: id,
        tipo: "en_camino",
        actorTipo: "repartidor",
        actorId: repartidor.id,
      });
    }
  }

  // --- Transición a ENTREGADO: requiere OTP válido y, opcionalmente, GPS. ---
  if (nuevoEstado === "entregado") {
    const otpIngresado = String(body.otp ?? "");
    const latEntrega = typeof body.lat === "number" ? body.lat : null;
    const lngEntrega = typeof body.lng === "number" ? body.lng : null;

    if (!otpIngresado) {
      return withCors(
        NextResponse.json(
          {
            error:
              "Debes pedirle al cliente el código de verificación (OTP) y escribirlo antes de marcar como entregado.",
          },
          { status: 400 }
        )
      );
    }

    const resultado = evaluarEntrega({
      otpIngresado,
      otpEsperado: pedido.otp_codigo,
      otpExpiraEn: pedido.otp_expira_en,
      intentosActuales: pedido.otp_intentos ?? 0,
      coordsPedido: { lat: pedido.lat, lng: pedido.lng },
      coordsEntrega:
        latEntrega !== null && lngEntrega !== null ? { lat: latEntrega, lng: lngEntrega } : null,
      aceptadoEn: pedido.aceptado_en,
    });

    if (!resultado.ok) {
      // OTP inválido: incrementamos intentos y bloqueamos si llega al máximo.
      const nuevosIntentos = (pedido.otp_intentos ?? 0) + 1;
      const bloqueado = nuevosIntentos >= OTP_MAX_INTENTOS;
      db.prepare(
        "UPDATE pedidos SET otp_intentos = ?, actualizado_en = datetime('now') WHERE id = ?"
      ).run(nuevosIntentos, id);
      registrarEvento(db, {
        pedidoId: id,
        tipo: "otp_invalido",
        actorTipo: "repartidor",
        actorId: repartidor.id,
        detalle: `${resultado.motivo ?? "OTP inválido"}${bloqueado ? " (BLOQUEADO)" : ""}`,
      });
      return withCors(
        NextResponse.json(
          {
            error: resultado.motivo ?? "OTP inválido",
            intentos: nuevosIntentos,
            bloqueado,
          },
          { status: 401 }
        )
      );
    }

    const sospechoso = !!resultado.motivo;
    db.prepare(
      `UPDATE pedidos
         SET estado = ?,
             otp_validado_en = ?,
             otp_validado_por = ?,
             entrega_lat = ?,
             entrega_lng = ?,
             alerta_distancia_km = ?,
             alerta_tiempo_seg = ?,
             alerta_motivo = ?,
             actualizado_en = datetime('now')
       WHERE id = ?`
    ).run(
      nuevoEstado,
      isoAhora(),
      repartidor.id,
      latEntrega,
      lngEntrega,
      resultado.distanciaKm ?? null,
      resultado.tiempoSeg ?? null,
      resultado.motivo ?? null,
      id
    );

    db.prepare("UPDATE repartidores SET estado = 'disponible' WHERE id = ?").run(repartidor.id);

    registrarEvento(db, {
      pedidoId: id,
      tipo: sospechoso ? "entregado_con_alerta" : "entregado",
      actorTipo: "repartidor",
      actorId: repartidor.id,
      detalle: resultado.motivo ?? "Entrega validada por OTP",
    });

    acumularEntrega(db, repartidor.id, sospechoso);
  }

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor;

  return withCors(NextResponse.json(row));
}