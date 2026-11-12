import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConsolidadoItem, PedidoDto } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';

type Vista = 'Cocina' | 'Bar' | 'Consolidado';
const VISTAS: Vista[] = ['Cocina', 'Bar', 'Consolidado'];

/**
 * Pantalla de cocina en el televisor no táctil, operada con teclado numérico USB.
 * 8/2 seleccionar · 4/6 vista · Enter avanzar · 0 deshacer · + / − confirmar o cancelar · «.» reimprimir.
 * HU-18, HU-25 a HU-30. Se abre con /kds?token=<token de pantalla>.
 */
@Component({
  selector: 'app-kds',
  standalone: true,
  templateUrl: './kds.component.html',
  styleUrl: './kds.component.css'
})
export class KdsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private rt = inject(RealtimeService);
  private route = inject(ActivatedRoute);
  private subs: Subscription[] = [];
  private reloj?: ReturnType<typeof setInterval>;

  vista = signal<Vista>('Cocina');
  pedidos = signal<PedidoDto[]>([]);
  consolidado = signal<ConsolidadoItem[]>([]);
  seleccion = signal(0);
  confirmando = signal<PedidoDto | null>(null);
  aviso = signal<string | null>(null);
  alertaComandera = signal<string | null>(null);
  conectado = signal(true);
  estacion = computed(() => this.vista() === 'Consolidado' ? this.ultimaEstacion : this.vista());
  seleccionado = computed(() => this.pedidos()[this.seleccion()] ?? null);
  private ultimaEstacion: 'Cocina' | 'Bar' = 'Cocina';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) this.auth.sesionPantallaCocina(token);
    const est = this.route.snapshot.queryParamMap.get('estacion');
    if (est === 'Bar') this.vista.set('Bar');
    this.cargar();
    this.subs.push(this.rt.escuchar<PedidoDto>('/topic/kds').subscribe(p => {
      if (p.estado === 'RECIBIDO' && !p.modificado) this.sonar();
      this.cargar();
    }));
    this.subs.push(this.rt.escuchar<{ mensaje: string }>('/topic/kds/alertas').subscribe(a => this.alertaComandera.set(a.mensaje)));
    this.reloj = setInterval(() => this.cargar(), 30_000);   // actualiza minutos y atrasos
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); clearInterval(this.reloj); }

  cargar(): void {
    if (this.vista() === 'Consolidado') {
      this.api.consolidado(this.ultimaEstacion).subscribe({ next: c => { this.consolidado.set(c); this.conectado.set(true); }, error: () => this.conectado.set(false) });
      return;
    }
    this.api.cola(this.vista()).subscribe({
      next: ps => {
        this.pedidos.set(ps);
        this.conectado.set(true);
        if (this.seleccion() >= ps.length) this.seleccion.set(Math.max(0, ps.length - 1));
      },
      error: () => this.conectado.set(false)
    });
  }

  @HostListener('window:keydown', ['$event'])
  tecla(ev: KeyboardEvent): void {
    const k = ev.key;
    if (this.confirmando()) {                                   // diálogo de verificación de alérgenos (HU-30)
      if (k === '+') this.avanzar(this.confirmando()!, true);
      if (k === '-') this.confirmando.set(null);
      ev.preventDefault();
      return;
    }
    switch (k) {
      case '8': case 'ArrowUp': this.mover(-1); break;
      case '2': case 'ArrowDown': this.mover(1); break;
      case '4': case 'ArrowLeft': this.cambiarVista(-1); break;
      case '6': case 'ArrowRight': this.cambiarVista(1); break;
      case 'Enter': if (this.seleccionado()) this.avanzar(this.seleccionado()!, false); break;
      case '0': if (this.seleccionado()) this.deshacer(this.seleccionado()!); break;
      case '.': case ',': case 'Decimal': if (this.seleccionado()) this.reimprimir(this.seleccionado()!); break;
      default: this.mostrar('Teclas: 8/2 mover · 4/6 vista · Enter avanzar · 0 deshacer · . reimprimir'); return;
    }
    ev.preventDefault();
  }

  mover(d: number): void {
    const n = this.pedidos().length;
    if (n) this.seleccion.set(Math.min(n - 1, Math.max(0, this.seleccion() + d)));
  }

  cambiarVista(d: number): void {
    const i = (VISTAS.indexOf(this.vista()) + d + VISTAS.length) % VISTAS.length;
    if (this.vista() !== 'Consolidado') this.ultimaEstacion = this.vista() as 'Cocina' | 'Bar';
    this.vista.set(VISTAS[i]);
    this.seleccion.set(0);
    this.cargar();
  }

  avanzar(p: PedidoDto, verificado: boolean): void {
    if (this.vista() === 'Consolidado') return;
    const vaAListo = p.lineas.every(l => l.avance === 'EN_PREPARACION');
    if (vaAListo && p.alertas && !verificado) { this.confirmando.set(p); return; }
    this.confirmando.set(null);
    this.api.avanzar(p.id, this.vista(), verificado).subscribe({ next: () => this.cargar(), error: e => this.mostrar(mensajeError(e)) });
  }

  deshacer(p: PedidoDto): void {
    this.api.deshacer(p.id, this.vista()).subscribe({ next: () => { this.mostrar('Cambio deshecho'); this.cargar(); }, error: e => this.mostrar(mensajeError(e)) });
  }

  reimprimir(p: PedidoDto): void {
    this.api.reimprimir(p.id, this.vista()).subscribe({ next: () => this.mostrar('Comanda reimpresa'), error: e => this.mostrar(mensajeError(e)) });
  }

  estadoDe(p: PedidoDto): string {
    return p.lineas.some(l => l.avance === 'EN_PREPARACION') ? 'En preparación' : 'Recibido';
  }

  private mostrar(m: string): void { this.aviso.set(m); setTimeout(() => this.aviso.set(null), 3000); }

  private sonar(): void {
    try { const c = new AudioContext(); const o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 660; o.start(); o.stop(c.currentTime + 0.3); } catch { /* sin audio */ }
  }
}
