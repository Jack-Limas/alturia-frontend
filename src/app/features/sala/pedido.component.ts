import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { ConexionService } from '../../core/conexion.service';
import { Interpretacion, PedidoDto, PedidoRequest, Producto } from '../../core/models';
import { OfflineQueueService } from '../../core/offline-queue.service';
import { BarraComponent } from '../../shared/barra.component';
import { MonedaPipe } from '../../shared/moneda.pipe';
import { VozService } from './voz.service';

interface Linea { producto: Producto; cantidad: number; observacion: string; verificar: boolean; }

/**
 * Toma de pedidos: manual (HU-13), en lenguaje natural escrito o dictado (HU-22, HU-23), revisión y corrección (HU-24),
 * confirmación (HU-14), modificación (HU-15) y registro sin red local (HU-16).
 */
@Component({
  selector: 'app-pedido',
  standalone: true,
  imports: [FormsModule, BarraComponent, MonedaPipe],
  templateUrl: './pedido.component.html',
  styleUrl: './pedido.component.css'
})
export class PedidoComponent implements OnInit {
  @Input() mesaId!: string;
  private api = inject(ApiService);
  private cola = inject(OfflineQueueService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  conexion = inject(ConexionService);
  voz = inject(VozService);

  numeroMesa = signal<number>(0);
  productos = signal<Producto[]>([]);
  busqueda = signal('');
  categoria = signal<string>('Todas');
  lineas = signal<Linea[]>([]);
  restricciones = signal<string[]>([]);
  nuevaRestriccion = '';
  frase = '';
  interpretacion = signal<Interpretacion | null>(null);
  sinAsignar = signal<string[]>([]);
  corregido = false;
  origen: 'MANUAL' | 'LENGUAJE_NATURAL' = 'MANUAL';
  fraseOriginal: string | null = null;
  pedidosMesa = signal<PedidoDto[]>([]);
  modificando = signal<PedidoDto | null>(null);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);
  interpretando = signal(false);

  categorias = computed(() => ['Todas', ...new Set(this.productos().map(p => p.categoria?.nombre ?? 'Otros'))]);
  filtrados = computed(() => {
    const q = normalizar(this.busqueda());
    return this.productos().filter(p => (this.categoria() === 'Todas' || p.categoria?.nombre === this.categoria())
      && (!q || normalizar(p.nombre).includes(q) || p.sinonimos.some(s => normalizar(s).includes(q))));
  });
  total = computed(() => this.lineas().reduce((t, l) => t + l.producto.precio * l.cantidad, 0));
  alertas = computed(() => this.lineas().filter(l => l.producto.alergenos.length).map(l => `${l.producto.nombre}: contiene ${l.producto.alergenos.join(', ')}`));
  puedeConfirmar = computed(() => this.lineas().length > 0 && !this.lineas().some(l => l.verificar) && this.sinAsignar().length === 0);

  ngOnInit(): void {
    this.numeroMesa.set(Number(this.route.snapshot.queryParamMap.get('numero') ?? 0));
    this.api.productos().subscribe({ next: ps => this.productos.set(ps), error: async () => this.productos.set(await this.cola.productos()) });
    this.cargarPedidosMesa();
  }

  cargarPedidosMesa(): void {
    this.api.pedidosActivos().subscribe({ next: ps => this.pedidosMesa.set(ps.filter(p => p.mesaId === Number(this.mesaId))), error: () => {} });
  }

  // ---------- Registro manual (HU-13) ----------
  agregar(p: Producto): void {
    if (!p.disponible) return;
    this.lineas.update(ls => {
      const i = ls.findIndex(l => l.producto.id === p.id && !l.observacion);
      if (i >= 0) { const c = [...ls]; c[i] = { ...c[i], cantidad: Math.min(99, c[i].cantidad + 1) }; return c; }
      return [...ls, { producto: p, cantidad: 1, observacion: '', verificar: false }];
    });
    this.marcarCorreccion();
  }
  cambiarCantidad(i: number, d: number): void {
    this.lineas.update(ls => ls.map((l, j) => j === i ? { ...l, cantidad: Math.max(1, Math.min(99, l.cantidad + d)) } : l));
    this.marcarCorreccion();
  }
  quitar(i: number): void { this.lineas.update(ls => ls.filter((_, j) => j !== i)); this.marcarCorreccion(); }
  aceptar(i: number): void { this.lineas.update(ls => ls.map((l, j) => j === i ? { ...l, verificar: false } : l)); }
  observar(i: number, texto: string): void {
    this.lineas.update(ls => ls.map((l, j) => j === i ? { ...l, observacion: texto.slice(0, 200) } : l));
    this.marcarCorreccion();
  }
  agregarRestriccion(): void {
    const r = this.nuevaRestriccion.trim();
    if (r) this.restricciones.update(rs => [...rs, r]);
    this.nuevaRestriccion = '';
  }
  quitarRestriccion(i: number): void { this.restricciones.update(rs => rs.filter((_, j) => j !== i)); }

  // ---------- Lenguaje natural (HU-22 a HU-24) ----------
  async dictar(): Promise<void> {
    this.error.set(null);
    try { this.frase = await this.voz.dictar(); }               // se muestra para que el mesero lo verifique
    catch (e) { this.error.set((e as Error).message); }
  }

  interpretar(): void {
    if (!this.frase.trim()) return;
    if (!this.conexion.servidor()) {
      this.error.set('La interpretación en lenguaje natural requiere la red del restaurante. Use el registro manual');
      return;
    }
    this.interpretando.set(true);
    this.error.set(null);
    this.api.interpretar(this.frase).subscribe({
      next: r => {
        this.interpretando.set(false);
        this.interpretacion.set(r);
        if (r.mensaje) { this.error.set(r.mensaje); }
        const nuevas: Linea[] = [];
        for (const it of r.items) {
          const p = this.productos().find(x => x.id === it.productoId);
          if (p) nuevas.push({ producto: p, cantidad: it.cantidad, observacion: it.modificaciones.join(', '), verificar: it.verificar || !p.disponible });
        }
        this.lineas.update(ls => [...ls, ...nuevas]);
        this.restricciones.update(rs => [...rs, ...r.restricciones]);
        this.sinAsignar.set(r.modificacionesSinAsignar);
        this.origen = 'LENGUAJE_NATURAL';
        this.fraseOriginal = this.frase;
        this.corregido = false;
      },
      error: e => {                                                // RNF-20: se conserva el texto y se pasa a manual
        this.interpretando.set(false);
        this.error.set(e.status === 503 ? 'No fue posible interpretar el pedido. Regístrelo manualmente' : mensajeError(e));
      }
    });
  }

  asignar(mod: string, indice: string): void {
    if (indice === '') return;
    const i = Number(indice);
    this.observar(i, [this.lineas()[i].observacion, mod].filter(Boolean).join(', '));
    this.sinAsignar.update(m => m.filter(x => x !== mod));
  }

  // ---------- Confirmación y modificación (HU-14, HU-15, HU-16) ----------
  async confirmar(): Promise<void> {
    this.error.set(null);
    const lineas = this.lineas().map(l => ({ productoId: l.producto.id, cantidad: l.cantidad, observacion: l.observacion || null }));
    const mod = this.modificando();
    if (mod) {
      this.api.modificarPedido(mod.id, lineas).subscribe({
        next: () => { this.mensaje.set('Modificación enviada a cocina'); this.limpiar(); this.cargarPedidosMesa(); },
        error: e => this.error.set(mensajeError(e))
      });
      return;
    }
    const req: PedidoRequest = {
      idLocal: crypto.randomUUID(), mesaId: Number(this.mesaId), origen: this.origen, lineas,
      restricciones: this.restricciones(), fraseOriginal: this.fraseOriginal, corregidoPorMesero: this.corregido
    };
    if (!this.conexion.servidor()) { await this.guardarPendiente(req); return; }
    this.api.crearPedido(req).subscribe({
      next: p => {
        this.mensaje.set(p.estado === 'REQUIERE_REVISION' ? 'El pedido tiene productos no disponibles: requiere revisión' : 'Pedido enviado a cocina');
        this.limpiar(); this.cargarPedidosMesa();
      },
      error: async e => { if (e.status === 0) await this.guardarPendiente(req); else this.error.set(mensajeError(e)); }
    });
  }

  editar(p: PedidoDto): void {
    this.modificando.set(p);
    this.lineas.set(p.lineas.filter(l => l.estado !== 'ANULADA').map(l => ({
      producto: this.productos().find(x => x.id === l.productoId)!, cantidad: l.cantidad, observacion: l.observacion ?? '', verificar: false
    })).filter(l => !!l.producto));
  }

  limpiar(): void {
    this.lineas.set([]); this.restricciones.set([]); this.sinAsignar.set([]); this.interpretacion.set(null);
    this.frase = ''; this.origen = 'MANUAL'; this.fraseOriginal = null; this.modificando.set(null);
  }

  volver(): void { this.router.navigateByUrl('/sala'); }

  private async guardarPendiente(req: PedidoRequest): Promise<void> {
    await this.cola.guardar(req, this.numeroMesa());
    this.conexion.pendientes.update(n => n + 1);
    this.mensaje.set('Pendiente de envío: el pedido llegará a cocina cuando se recupere la conexión. Avíselo en cocina');
    this.limpiar();
  }

  private marcarCorreccion(): void { if (this.origen === 'LENGUAJE_NATURAL') this.corregido = true; }
}

function normalizar(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
