/** Contratos con el backend (ver alturia-backend/docs/API.md). */
export type Rol = 'ADMINISTRADOR' | 'MESERO' | 'CAJERO' | 'COCINA';
export type EstadoMesa = 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'POR_PAGAR';
export type EstadoPedido = 'PENDIENTE_ENVIO' | 'RECIBIDO' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'ANULADO' | 'REQUIERE_REVISION';

export interface Sesion { token: string; usuarioId: number | null; nombre: string; rol: Rol; }
export interface Estacion { id: number; nombre: string; porDefecto: boolean; }
export interface Categoria { id: number; nombre: string; }
export interface Producto {
  id: number; nombre: string; precio: number; categoria: Categoria; estacion: Estacion | null;
  tiempoPreparacionMin: number; sinonimos: string[]; alergenos: string[]; disponible: boolean; activo: boolean;
}
export interface Mesa { id: number; numero: number; capacidad: number; estado: EstadoMesa; }

export interface LineaRequest { productoId: number; cantidad: number; observacion?: string | null; }
export interface PedidoRequest {
  idLocal: string; mesaId: number; origen: 'MANUAL' | 'LENGUAJE_NATURAL'; lineas: LineaRequest[];
  restricciones: string[]; fraseOriginal?: string | null; corregidoPorMesero?: boolean;
}
export interface LineaDto {
  id: number; productoId: number; producto: string; cantidad: number; observacion: string | null; estacion: string;
  estado: 'ACTIVA' | 'MODIFICADA' | 'ANULADA'; avance: EstadoPedido; subtotal: number; alergenos: string[];
}
export interface PedidoDto {
  id: number; idLocal: string; mesaId: number; mesa: number; mesero: string; estado: EstadoPedido; origen: string;
  fechaConfirmacion: string; minutos: number; atrasado: boolean; modificado: boolean; alertas: boolean;
  restricciones: string[]; total: number; lineas: LineaDto[];
}
export interface ConsolidadoItem { producto: string; variante: string | null; cantidad: number; }

/** Respuesta del servicio NLP (alturia-nlp, POST /interpretar). */
export interface ItemInterpretado {
  productoId: number | null; producto: string | null; cantidad: number; modificaciones: string[];
  confianza: number; verificar: boolean; texto: string;
}
export interface Interpretacion {
  intencion: string; items: ItemInterpretado[]; restricciones: string[]; modificacionesSinAsignar: string[];
  noReconocidos: string[]; mensaje: string | null; modelo: string; tiempoMs: number;
}

export interface ItemCuenta { producto: string; cantidad: number; precioUnitario: number; subtotal: number; entregado: boolean; }
export interface Comprobante { id: number; consecutivo: number; total: number; fechaEmision: string; leyenda: string; }
export interface CuentaDto {
  cuentaId: number; mesaId: number; mesa: number; estado: string; items: ItemCuenta[]; total: number;
  hayPedidosSinEntregar: boolean; comprobante: Comprobante | null;
}
export interface PagoRequest { efectivoRecibido: number | null; valorTransferencia: number | null; referenciaTransferencia: string | null; }
export interface Pago {
  id: number; medio: 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO'; valorEfectivo: number; valorRecibido: number; cambio: number;
  valorTransferencia: number; referenciaTransferencia: string | null; cajeroNombre: string; fecha: string;
}
export interface PagoDto { pago: Pago; comprobante: Comprobante; }
export interface Aviso { tipo: 'PEDIDO_LISTO' | 'REQUIERE_REVISION'; pedidoId: number; mesa: number; meseroId: string; mensaje: string; }
