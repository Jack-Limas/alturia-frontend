import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Aviso, Mesa, PedidoDto } from '../../core/models';
import { OfflineQueueService } from '../../core/offline-queue.service';
import { RealtimeService } from '../../core/realtime.service';
import { BarraComponent } from '../../shared/barra.component';

interface GrupoZona { clave: string; nombre: string; mesas: Mesa[]; capacidad: number; disponibles: number; }

/** HU-07 (estado de mesas) y HU-19 (avisos de pedido listo y entrega). */
@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [BarraComponent],
  template: `
    <app-barra titulo="Sala" />
    <div class="contenedor dos">
      <section>
        <h2>Mesas</h2>
        @if (grupos().length > 1) {
          <div class="filtro">
            <button type="button" [class.primario]="zonaSel() === null" (click)="zonaSel.set(null)">Todas</button>
            @for (g of grupos(); track g.clave) {
              <button type="button" [class.primario]="zonaSel() === g.clave" (click)="zonaSel.set(g.clave)">{{ g.nombre }}</button>
            }
          </div>
        }
        @for (g of visibles(); track g.clave) {
          <h3 class="zona">{{ g.nombre }}
            <small class="muted">{{ g.disponibles }}/{{ g.mesas.length }} disponibles · {{ g.capacidad }} personas</small></h3>
          <div class="mesas">
            @for (m of g.mesas; track m.id) {
              <button type="button" class="mesa" [class]="'mesa ' + m.estado" (click)="abrir(m)">
                <strong>{{ m.numero }}</strong><small>{{ etiqueta(m.estado) }}</small><small class="muted">{{ m.capacidad }} pers.</small>
              </button>
            }
          </div>
        }
      </section>
      <aside class="tarjeta">
        <h2>Avisos</h2>
        @for (p of listos(); track p.id) {
          <div class="aviso">
            <div><strong>Mesa {{ p.mesa }}</strong> · pedido #{{ p.id }} listo</div>
            <button class="primario" type="button" (click)="entregar(p)">Entregado</button>
          </div>
        } @empty { <p class="muted">Sin pedidos listos.</p> }
        @for (a of revision(); track a.pedidoId) { <p class="error">{{ a.mensaje }}</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }
      </aside>
    </div>`,
  styles: [`
    .dos{display:grid;grid-template-columns:1fr 320px;gap:1rem}@media(max-width:800px){.dos{grid-template-columns:1fr}}
    .mesas{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.75rem}
    .mesa{display:grid;gap:.2rem;padding:1rem;border-radius:14px;font-size:1rem;text-align:center}
    .mesa strong{font-size:1.8rem}.DISPONIBLE{background:#e3f3e8}.OCUPADA{background:#f3e4dc}.RESERVADA{background:#e1e9f7}.POR_PAGAR{background:#fff1d6}
    .filtro{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem}.zona{margin:1rem 0 .5rem;display:flex;gap:.75rem;align-items:baseline;flex-wrap:wrap}
    .aviso{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.6rem 0;border-bottom:1px solid var(--borde)}`]
})
export class MesasComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private rt = inject(RealtimeService);
  private cola = inject(OfflineQueueService);
  mesas = signal<Mesa[]>([]);
  listos = signal<PedidoDto[]>([]);
  revision = signal<Aviso[]>([]);
  error = signal<string | null>(null);
  /** Zona seleccionada en el filtro (null = todas). */
  zonaSel = signal<string | null>(null);

  /** Flujo zona → mesa → capacidad: agrupa las mesas por zona y suma la capacidad de cada una. */
  grupos = computed<GrupoZona[]>(() => {
    const mapa = new Map<string, GrupoZona>();
    for (const m of this.mesas()) {
      const clave = m.zona ? String(m.zona.id) : 'sin-zona';
      const g = mapa.get(clave) ?? { clave, nombre: m.zona?.nombre ?? 'Sin zona', mesas: [], capacidad: 0, disponibles: 0 };
      g.mesas.push(m);
      g.capacidad += m.capacidad;
      if (m.estado === 'DISPONIBLE') g.disponibles++;
      mapa.set(clave, g);
    }
    return [...mapa.values()].sort((a, b) => a.clave === 'sin-zona' ? 1 : b.clave === 'sin-zona' ? -1 : a.nombre.localeCompare(b.nombre));
  });
  visibles = computed(() => this.grupos().filter(g => this.zonaSel() === null || g.clave === this.zonaSel()));

  ngOnInit(): void {
    this.cargar();
    this.rt.escuchar<Mesa>('/topic/mesas').subscribe(m => this.mesas.update(ms => ms.map(x => x.id === m.id ? m : x)));
    this.rt.escuchar<Aviso>('/topic/sala/avisos').subscribe(a => {
      const mio = String(this.auth.sesion()?.usuarioId) === a.meseroId;
      if (!mio) return;
      if (a.tipo === 'PEDIDO_LISTO') { this.sonar(); this.cargarListos(); }
      else this.revision.update(r => [a, ...r]);
    });
  }

  cargar(): void {
    this.api.mesas().subscribe({
      next: ms => { this.mesas.set(ms); this.api.productos().subscribe(ps => this.cola.guardarCatalogo(ps, ms)); },
      error: async () => this.mesas.set(await this.cola.mesas())     // sin red: copia guardada en la tablet
    });
    this.cargarListos();
  }

  cargarListos(): void {
    this.api.pedidosActivos().subscribe({ next: ps => this.listos.set(ps.filter(p => p.estado === 'LISTO')), error: () => {} });
  }

  abrir(m: Mesa): void { this.router.navigate(['/sala/mesa', m.id], { queryParams: { numero: m.numero } }); }

  entregar(p: PedidoDto): void {
    this.api.entregar(p.id).subscribe({ next: () => this.cargarListos(), error: e => this.error.set(mensajeError(e)) });
  }

  etiqueta(e: string): string { return ({ DISPONIBLE: 'Disponible', OCUPADA: 'Ocupada', RESERVADA: 'Reservada', POR_PAGAR: 'Por pagar' } as Record<string, string>)[e]; }

  private sonar(): void {
    try { const c = new AudioContext(); const o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + 0.25); } catch { /* sin audio */ }
  }
}
