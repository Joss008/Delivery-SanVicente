export type Rol = "restaurante" | "repartidor";

export type EstadoRepartidor = "disponible" | "ocupado" | "inactivo";

export type EstadoPedido = "pendiente" | "asignado" | "en_camino" | "entregado";

export interface Repartidor {
  id: number;
  nombre: string;
  telefono: string;
  estado: EstadoRepartidor;
  lat: number;
  lng: number;
  actualizado_en: string;
}

export interface Pedido {
  id: number;
  codigo: string;
  descripcion: string;
  estado: EstadoPedido;
  repartidor_id: number | null;
  lat: number;
  lng: number;
  creado_en: string;
}

export interface PedidoConRepartidor extends Pedido {
  repartidor_nombre: string | null;
}
