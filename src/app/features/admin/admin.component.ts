import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError } from '../../core/api.service';
import { Categoria, Estacion, Mesa, Producto, Zona } from '../../core/models';
import { BarraComponent } from '../../shared/barra.component';
import { MonedaPipe } from '../../shared/moneda.pipe';

type Pestana = 'productos' | 'mesas' | 'usuarios' | 'reservas' | 'reportes';

/** Panel de administración: menú (HU-03, HU-04), mesas (HU-06) y usuarios (HU-02). Reservas y reportes: pendientes (Jack). */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, BarraComponent, MonedaPipe],
  templateUrl: './admin.component.html',
  styles: [`.tabs{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;align-items:end;margin-bottom:1rem}`]
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  pestana = signal<Pestana>('productos');
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  estaciones = signal<Estacion[]>([]);
  mesas = signal<Mesa[]>([]);
  zonas = signal<Zona[]>([]);
  usuarios = signal<{ id: number; nombre: string; usuario: string; rol: string; activo: boolean }[]>([]);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  nuevo = { nombre: '', precio: 0, categoriaId: 0, estacionId: 0, tiempoPreparacionMin: 15, sinonimos: '', alergenos: '' };
  zonaNueva = '';
  mesaNueva = { zonaId: 0, numero: 0, capacidad: 4 };
  usuarioNuevo = { nombre: '', usuario: '', rol: 'MESERO', contrasena: '' };

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.api.productos().subscribe(p => this.productos.set(p));
    this.api.categorias().subscribe(c => this.categorias.set(c));
    this.api.estaciones().subscribe(e => this.estaciones.set(e));
    this.api.mesas().subscribe(m => this.mesas.set(m));
    this.api.zonas().subscribe(z => {
      this.zonas.set(z);
      if (!this.mesaNueva.zonaId && z.length) this.mesaNueva.zonaId = z[0].id;
    });
    this.api.usuarios().subscribe({ next: u => this.usuarios.set(u), error: () => {} });
  }

  crearProducto(): void {
    const lista = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    this.api.crearProducto({ ...this.nuevo, sinonimos: lista(this.nuevo.sinonimos), alergenos: lista(this.nuevo.alergenos) })
      .subscribe({ next: () => { this.exito('Producto guardado'); this.cargar(); }, error: e => this.fallo(e) });
  }

  alternar(p: Producto): void {
    this.api.disponibilidad(p.id, !p.disponible).subscribe({ next: () => this.cargar(), error: e => this.fallo(e) });
  }

  crearZona(): void {
    if (!this.zonaNueva.trim()) { this.error.set('Escriba el nombre de la zona'); return; }
    this.api.crearZona(this.zonaNueva).subscribe({
      next: z => { this.exito(`Zona «${z.nombre}» creada`); this.zonaNueva = ''; this.mesaNueva.zonaId = z.id; this.cargar(); },
      error: e => this.fallo(e)
    });
  }

  crearMesa(): void {
    if (!this.mesaNueva.zonaId) { this.error.set('Primero cree o seleccione una zona'); return; }
    this.api.crearMesa(this.mesaNueva.numero, this.mesaNueva.capacidad, this.mesaNueva.zonaId)
      .subscribe({ next: () => { this.exito('Mesa registrada'); this.cargar(); }, error: e => this.fallo(e) });
  }

  cambiarZona(m: Mesa, zonaId: number): void {
    this.api.cambiarZonaMesa(m.id, zonaId).subscribe({ next: () => { this.exito(`Mesa ${m.numero} movida de zona`); this.cargar(); }, error: e => this.fallo(e) });
  }

  mesasDe(z: Zona): Mesa[] { return this.mesas().filter(m => m.zona?.id === z.id); }
  mesasSinZona(): Mesa[] { return this.mesas().filter(m => !m.zona); }

  crearUsuario(): void {
    this.api.crearUsuario(this.usuarioNuevo).subscribe({ next: () => { this.exito('Usuario creado'); this.cargar(); }, error: e => this.fallo(e) });
  }

  private exito(m: string): void { this.ok.set(m); this.error.set(null); }
  private fallo(e: unknown): void { this.error.set(mensajeError(e)); this.ok.set(null); }
}
