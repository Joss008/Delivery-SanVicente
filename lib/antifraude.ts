import type { DatabaseSync } from "node:sqlite";

/**
 * Reglas antifraude para entregas.
 *
 * Las reglas NO bloquean la operación por sí solas (la prueba principal es el
 * OTP). En cambio, dejan evidencia y suman contadores para que el admin
 * pueda revisar manualmente. La única regla dura es la de intentos OTP, que
 * sí bloquea para evitar fuerza bruta.
 */

export const OTP_LONGITUD = 6;
export const OTP_EXPIRACION_HORAS = 24;
export const OTP_MAX_INTENTOS = 3;

/** Distancia máxima permitida entre la dirección de entrega y el GPS del
 *  repartidor al momento de validar. Más allá se marca como "fuera de ruta". */
export const ANTIFRAUDE_RADIO_ENTREGA_KM = 0.5;

/** Tiempo mínimo (segundos) entre "aceptado" y "entregado". Por debajo se
 *  considera sospechoso (no dio tiempo a hacer la entrega físicamente). */
export const ANTIFRAUDE_TIEMPO_MIN_ENTREGA_SEG = 90;

/** Cantidad de reclamos en los últimos N días que dispara alerta. */
export const ANTIFRAUDE_RECLAMOS_VENTANA_DIAS = 30;
export const ANTIFRAUDE_RECLAMOS_UMBRAL = 2;

/** % de entregas sospechosas sobre el total a partir del cual se alerta. */
export const ANTIFRAUDE_TASA_SOSPECHOSA = 0.2;

import { randomInt } from "node:crypto";

/**
 * Genera un código OTP numérico de longitud fija. Usa `crypto.randomInt` para
 * evitar sesgos del `Math.random` y garantizar entropía criptográfica.
 */
export function generarOtp(): string {
  let s = "";
  for (let i = 0; i < OTP_LONGITUD; i++) {
    s += String(randomInt(0, 10));
  }
  return s;
}

export function ahoraMasHorasIso(horas: number): string {
  const d = new Date(Date.now() + horas * 3600_000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function isoAhora(): string {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface ResultadoEntrega {
  ok: boolean;
  motivo?: string;
  distanciaKm?: number;
  tiempoSeg?: number;
}

/**
 * Evalúa si la entrega con OTP es legítima. Devuelve `ok=false` si la regla
 * es dura (intentos agotados, OTP incorrecto/expirado). Para reglas suaves
 * (distancia, tiempo) devuelve `ok=true` con banderas para guardar.
 */
export function evaluarEntrega(args: {
  otpIngresado: string;
  otpEsperado: string | null;
  otpExpiraEn: string | null;
  intentosActuales: number;
  coordsPedido: Coordenadas;
  coordsEntrega: Coordenadas | null;
  aceptadoEn: string | null;
}): ResultadoEntrega {
  if (!args.otpEsperado) {
    return { ok: false, motivo: "El pedido no tiene un código OTP activo." };
  }
  if (args.intentosActuales >= OTP_MAX_INTENTOS) {
    return {
      ok: false,
      motivo:
        "El código OTP está bloqueado por demasiados intentos fallidos. Solicita uno nuevo al administrador.",
    };
  }
  if (
    args.otpExpiraEn &&
    new Date(args.otpExpiraEn.replace(" ", "T") + "Z").getTime() < Date.now()
  ) {
    return {
      ok: false,
      motivo: "El código OTP expiró. Solicita uno nuevo al administrador.",
    };
  }
  if (args.otpIngresado.trim() !== args.otpEsperado) {
    return { ok: false, motivo: "El código OTP ingresado no coincide." };
  }

  let distanciaKm: number | undefined;
  let tiempoSeg: number | undefined;
  const flags: string[] = [];

  if (args.coordsEntrega) {
    distanciaKm = haversineKm(
      args.coordsPedido.lat,
      args.coordsPedido.lng,
      args.coordsEntrega.lat,
      args.coordsEntrega.lng
    );
    if (distanciaKm > ANTIFRAUDE_RADIO_ENTREGA_KM) {
      flags.push(
        `GPS fuera de rango (${distanciaKm.toFixed(2)} km vs ${ANTIFRAUDE_RADIO_ENTREGA_KM} km permitidos)`
      );
    }
  } else {
    flags.push("Repartidor entregó sin enviar coordenadas GPS");
  }

  if (args.aceptadoEn) {
    const tAcept = new Date(args.aceptadoEn.replace(" ", "T") + "Z").getTime();
    tiempoSeg = Math.round((Date.now() - tAcept) / 1000);
    if (tiempoSeg < ANTIFRAUDE_TIEMPO_MIN_ENTREGA_SEG) {
      flags.push(
        `Entrega demasiado rápida (${tiempoSeg} s vs mínimo ${ANTIFRAUDE_TIEMPO_MIN_ENTREGA_SEG} s)`
      );
    }
  }

  return {
    ok: true,
    distanciaKm,
    tiempoSeg,
    motivo: flags.length ? flags.join("; ") : undefined,
  };
}

/**
 * Registra un evento en la tabla `pedido_eventos`. Es la fuente de verdad
 * para auditoría.
 */
export function registrarEvento(
  db: DatabaseSync,
  args: {
    pedidoId: number;
    tipo: string;
    actorTipo?: string | null;
    actorId?: number | null;
    detalle?: string | null;
  }
) {
  db.prepare(
    `INSERT INTO pedido_eventos (pedido_id, tipo, actor_tipo, actor_id, detalle)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    args.pedidoId,
    args.tipo,
    args.actorTipo ?? null,
    args.actorId ?? null,
    args.detalle ?? null
  );
}

export function acumularEntrega(
  db: DatabaseSync,
  repartidorId: number,
  fueSospechosa: boolean
) {
  const existente = db
    .prepare(
      "SELECT entregas_totales, entregas_sospechosas FROM repartidor_alertas WHERE repartidor_id = ?"
    )
    .get(repartidorId) as
    | { entregas_totales: number; entregas_sospechosas: number }
    | undefined;
  if (!existente) {
    db.prepare(
      `INSERT INTO repartidor_alertas
         (repartidor_id, entregas_totales, entregas_sospechosas, ultima_alerta_en)
       VALUES (?, 1, ?, ?)`
    ).run(repartidorId, fueSospechosa ? 1 : 0, fueSospechosa ? isoAhora() : null);
  } else {
    db.prepare(
      `UPDATE repartidor_alertas
         SET entregas_totales = entregas_totales + 1,
             entregas_sospechosas = entregas_sospechosas + ?,
             ultima_alerta_en = CASE WHEN ? THEN ? ELSE ultima_alerta_en END,
             actualizado_en = datetime('now')
       WHERE repartidor_id = ?`
    ).run(
      fueSospechosa ? 1 : 0,
      fueSospechosa ? 1 : 0,
      isoAhora(),
      repartidorId
    );
  }
}

export function acumularReclamo(db: DatabaseSync, repartidorId: number) {
  const existente = db
    .prepare(
      "SELECT reclamos_totales FROM repartidor_alertas WHERE repartidor_id = ?"
    )
    .get(repartidorId) as { reclamos_totales: number } | undefined;
  if (!existente) {
    db.prepare(
      `INSERT INTO repartidor_alertas
         (repartidor_id, reclamos_totales, ultima_alerta_en)
       VALUES (?, 1, ?)`
    ).run(repartidorId, isoAhora());
  } else {
    db.prepare(
      `UPDATE repartidor_alertas
         SET reclamos_totales = reclamos_totales + 1,
             ultima_alerta_en = ?,
             actualizado_en = datetime('now')
       WHERE repartidor_id = ?`
    ).run(isoAhora(), repartidorId);
  }
}

export function repartidoresEnObservacion(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT r.id, r.nombre, r.telefono,
              a.entregas_totales, a.entregas_sospechosas,
              a.reclamos_totales, a.ultima_alerta_en
         FROM repartidor_alertas a
         JOIN repartidores r ON r.id = a.repartidor_id
        WHERE a.reclamos_totales >= ?
           OR (a.entregas_totales >= 5
               AND CAST(a.entregas_sospechosas AS REAL) / a.entregas_totales >= ?)
        ORDER BY a.ultima_alerta_en DESC NULLS LAST`
    )
    .all(ANTIFRAUDE_RECLAMOS_UMBRAL, ANTIFRAUDE_TASA_SOSPECHOSA) as Array<{
    id: number;
    nombre: string;
    telefono: string;
    entregas_totales: number;
    entregas_sospechosas: number;
    reclamos_totales: number;
    ultima_alerta_en: string | null;
  }>;
}

export function resumenAntifraude(db: DatabaseSync) {
  const reclamosRecientes = db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM pedidos
        WHERE reclamado_en IS NOT NULL
          AND julianday('now') - julianday(reclamado_en) <= ?`
    )
    .get(ANTIFRAUDE_RECLAMOS_VENTANA_DIAS) as { n: number };

  const intentosFallidos = db
    .prepare(
      `SELECT COUNT(*) AS n FROM pedido_eventos
        WHERE tipo = 'otp_invalido'
          AND julianday('now') - julianday(creado_en) <= 7`
    )
    .get() as { n: number };

  const entregasSospechosas = db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM pedidos
        WHERE alerta_motivo IS NOT NULL
          AND julianday('now') - julianday(creado_en) <= ?`
    )
    .get(ANTIFRAUDE_RECLAMOS_VENTANA_DIAS) as { n: number };

  const pedidosDisputados = db
    .prepare(`SELECT COUNT(*) AS n FROM pedidos WHERE estado = 'disputado'`)
    .get() as { n: number };

  return {
    reclamosRecientes: reclamosRecientes.n,
    intentosFallidosSemana: intentosFallidos.n,
    entregasSospechosas: entregasSospechosas.n,
    pedidosDisputados: pedidosDisputados.n,
  };
}

export function eventosDePedido(db: DatabaseSync, pedidoId: number) {
  return db
    .prepare(
      `SELECT id, pedido_id, tipo, actor_tipo, actor_id, detalle, creado_en
         FROM pedido_eventos
        WHERE pedido_id = ?
        ORDER BY creado_en DESC, id DESC`
    )
    .all(pedidoId) as Array<{
    id: number;
    pedido_id: number;
    tipo: string;
    actor_tipo: string | null;
    actor_id: number | null;
    detalle: string | null;
    creado_en: string;
  }>;
}