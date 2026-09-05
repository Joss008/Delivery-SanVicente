export type RolUsuario = 1 | 2;
export type RolEtiqueta = "admin" | "empresa";
export type Rol = "admin" | "empresa" | "repartidor";

export type EstadoRepartidor = "disponible" | "ocupado" | "inactivo";

export type EstadoPedido = "pendiente" | "asignado" | "en_camino" | "entregado";

export interface Usuario {
  id: number;
  rol_id: RolUsuario;
  nombre: string;
  email: string;
  creado_en?: string;
}

export interface Repartidor {
  id: number;
  nombre: string;
  telefono: string;
  estado: EstadoRepartidor;
  lat: number;
  lng: number;
  actualizado_en: string;
  /**
   * Fecha/hora de la última ubicación recibida desde la PWA del repartidor.
   * Si es `null`, el repartidor aún no envió su GPS real y debe ocultarse del mapa.
   */
  ubicacion_recibida_en: string | null;
  empresa_id: number | null;
}

export interface Pedido {
  id: number;
  codigo: string;
  empresa: string;
  empresa_id: number | null;
  direccion_recojo: string;
  direccion_entrega: string;
  observaciones: string | null;
  estado: EstadoPedido;
  repartidor_id: number | null;
  lat: number;
  lng: number;
  creado_en: string;
  actualizado_en: string;
}

export interface PedidoConRepartidor extends Pedido {
  repartidor_nombre: string | null;
}
