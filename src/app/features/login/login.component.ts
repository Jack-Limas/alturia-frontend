import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

/** HU-01: iniciar sesión y llegar a la pantalla del rol (o cambiar de usuario si ya hay una sesión abierta). */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="centro">
      <form class="tarjeta" (ngSubmit)="ingresar()">
        <h1>Alturia</h1>
        <p class="muted">Gestión de pedidos · Restaurante Alturia</p>
        @if (auth.sesion(); as s) {
          <div class="activa">
            <span>Sesión activa: <strong>{{ s.nombre }}</strong> ({{ auth.nombreRol(s.rol) }})</span>
            <div class="fila">
              <button type="button" (click)="continuar()">Continuar como {{ auth.nombreRol(s.rol) }}</button>
              <button type="button" (click)="cerrarSesion()">Cerrar sesión</button>
            </div>
            <small class="muted">O ingrese abajo con otro usuario.</small>
          </div>
        }
        <label>Usuario <input name="usuario" [(ngModel)]="usuario" autocomplete="username" required></label>
        <label>Contraseña <input name="contrasena" type="password" [(ngModel)]="contrasena" autocomplete="current-password" required></label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button class="primario" type="submit" [disabled]="cargando() || !usuario || !contrasena">Ingresar</button>
      </form>
    </main>`,
  styles: [`.centro{min-height:100vh;display:grid;place-items:center;padding:1rem}form{width:min(380px,100%);display:grid;gap:1rem}.activa{display:grid;gap:.5rem;padding:.75rem;border:1px solid var(--borde);border-radius:10px}.fila{display:flex;gap:.5rem;flex-wrap:wrap}h1{color:var(--marca)}`]
})
export class LoginComponent {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);
  usuario = '';
  contrasena = '';
  error = signal<string | null>(null);
  cargando = signal(false);

  /** Ya no redirige solo: con una sesión abierta se puede continuar o cambiar de usuario. */
  continuar(): void {
    const s = this.auth.sesion();
    if (s) this.router.navigateByUrl(this.auth.inicioPorRol(s.rol));
  }

  cerrarSesion(): void { this.auth.cerrar(); }

  ingresar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.login(this.usuario.trim(), this.contrasena).subscribe({
      next: s => { this.auth.guardar(s); this.router.navigateByUrl(this.auth.inicioPorRol(s.rol)); },
      error: e => { this.error.set(e.status === 0 ? 'Se requiere la red del restaurante para iniciar sesión' : mensajeError(e)); this.cargando.set(false); }
    });
  }
}
