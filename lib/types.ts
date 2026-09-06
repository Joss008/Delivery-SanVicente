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
  /**
   * Dirección del negocio de la empresa (solo aplica a rol_id = 2).
   * Se usa como `direccion_recojo` automática en cada pedido nuevo.
   */
  direccion?: string | null;
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
  /**
   * Fecha/hora en que el repartidor desactivó manualmente el envío de
   * ubicación desde la PWA. Si está definida, el mapa muestra el marcador
   * con un estilo atenuado ("GPS en pausa"). Se limpia automáticamente con
   * el siguiente envío real o cuando el repartidor cierra sesión.
   */
  gps_pausado_en: string | null;
  empresa_id: number | null;
  /**
   * Chat ID de Telegram del repartidor. Si está definido, el sistema le envía
   * notificaciones push cuando se le asignan pedidos o hay pedidos disponibles.
   */
  telegram_chat_id: string | null;
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
