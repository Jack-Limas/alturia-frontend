import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConsolidadoItem, CuentaDto, Interpretacion, LineaRequest, Mesa, PagoDto, PagoRequest, PedidoDto, PedidoRequest, Producto, Sesion,
  Categoria, Estacion
} from './models';

/** Único punto de acceso HTTP al servidor local. Las rutas son relativas: el servidor local sirve esta app. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  login(usuario: string, contrasena: string): Observable<Sesion> { return this.http.post<Sesion>('/api/auth/login', { usuario, contrasena }); }
  salud(): Observable<unknown> { return this.http.get('/api/salud'); }

  productos(): Observable<Producto[]> { return this.http.get<Producto[]>('/api/menu/productos'); }
  categorias(): Observable<Categoria[]> { return this.http.get<Categoria[]>('/api/menu/categorias'); }
  estaciones(): Observable<Estacion[]> { return this.http.get<Estacion[]>('/api/menu/estaciones'); }
  crearProducto(p: unknown): Observable<Producto> { return this.http.post<Producto>('/api/menu/productos', p); }
  disponibilidad(id: number, valor: boolean): Observable<Producto> {
    return this.http.patch<Producto>(`/api/menu/productos/${id}/disponible`, null, { params: { valor } });
  }

  mesas(): Observable<Mesa[]> { return this.http.get<Mesa[]>('/api/mesas'); }
  crearMesa(numero: number, capacidad: number): Observable<Mesa> { return this.http.post<Mesa>('/api/mesas', { numero, capacidad }); }
  crearUsuario(u: unknown): Observable<unknown> { return this.http.post('/api/usuarios', u); }
  usuarios(): Observable<{ id: number; nombre: string; usuario: string; rol: string; activo: boolean }[]> {
    return this.http.get<{ id: number; nombre: string; usuario: string; rol: string; activo: boolean }[]>('/api/usuarios');
  }

  interpretar(frase: string): Observable<Interpretacion> { return this.http.post<Interpretacion>('/api/nlp/interpretar', { frase }); }
  crearPedido(p: PedidoRequest): Observable<PedidoDto> { return this.http.post<PedidoDto>('/api/pedidos', p); }
  modificarPedido(id: number, lineas: LineaRequest[]): Observable<PedidoDto> { return this.http.put<PedidoDto>(`/api/pedidos/${id}/lineas`, lineas); }
  pedidosActivos(): Observable<PedidoDto[]> { return this.http.get<PedidoDto[]>('/api/pedidos/activos'); }
  entregar(id: number): Observable<PedidoDto> { return this.http.post<PedidoDto>(`/api/pedidos/${id}/entregar`, null); }

  cola(estacion: string): Observable<PedidoDto[]> { return this.http.get<PedidoDto[]>('/api/kds/cola', { params: { estacion } }); }
  consolidado(estacion: string): Observable<ConsolidadoItem[]> { return this.http.get<ConsolidadoItem[]>('/api/kds/consolidado', { params: { estacion } }); }
  avanzar(id: number, estacion: string, verificado = false): Observable<PedidoDto> {
    return this.http.post<PedidoDto>(`/api/kds/pedidos/${id}/avanzar`, null, { params: { estacion, verificado } });
  }
  deshacer(id: number, estacion: string): Observable<PedidoDto> { return this.http.post<PedidoDto>(`/api/kds/pedidos/${id}/deshacer`, null, { params: { estacion } }); }
  reimprimir(id: number, estacion: string): Observable<void> { return this.http.post<void>(`/api/kds/pedidos/${id}/reimprimir`, null, { params: { estacion } }); }

  cuentas(): Observable<CuentaDto[]> { return this.http.get<CuentaDto[]>('/api/caja/cuentas'); }
  cuenta(mesaId: number): Observable<CuentaDto> { return this.http.get<CuentaDto>(`/api/caja/mesas/${mesaId}/cuenta`); }
  pagar(mesaId: number, r: PagoRequest): Observable<PagoDto> { return this.http.post<PagoDto>(`/api/caja/mesas/${mesaId}/pagos`, r); }
}

/** Extrae el mensaje legible que envía el backend ({ mensaje }). */
export function mensajeError(e: unknown): string {
  const err = e as { status?: number; error?: { mensaje?: string } };
  if (err?.status === 0) return 'Sin conexión con el servidor del restaurante';
  return err?.error?.mensaje ?? 'Ocurrió un error inesperado';
}
