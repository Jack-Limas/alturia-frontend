import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

/** HU-01: iniciar sesión y llegar a la pantalla del rol. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="centro">
      <form class="tarjeta" (ngSubmit)="ingresar()">
        <h1>Alturia</h1>
        <p class="muted">Gestión de pedidos · Restaurante Alturia</p>
        <label>Usuario <input name="usuario" [(ngModel)]="usuario" autocomplete="username" required></label>
        <label>Contraseña <input name="contrasena" type="password" [(ngModel)]="contrasena" autocomplete="current-password" required></label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button class="primario" type="submit" [disabled]="cargando() || !usuario || !contrasena">Ingresar</button>
      </form>
    </main>`,
  styles: [`.centro{min-height:100vh;display:grid;place-items:center;padding:1rem}form{width:min(380px,100%);display:grid;gap:1rem}h1{color:var(--marca)}`]
})
export class LoginComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  usuario = '';
  contrasena = '';
  error = signal<string | null>(null);
  cargando = signal(false);

  constructor() {
    const s = this.auth.sesion();
    if (s) this.router.navigateByUrl(this.auth.inicioPorRol(s.rol));
  }

  ingresar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.login(this.usuario.trim(), this.contrasena).subscribe({
      next: s => { this.auth.guardar(s); this.router.navigateByUrl(this.auth.inicioPorRol(s.rol)); },
      error: e => { this.error.set(e.status === 0 ? 'Se requiere la red del restaurante para iniciar sesión' : mensajeError(e)); this.cargando.set(false); }
    });
  }
}
