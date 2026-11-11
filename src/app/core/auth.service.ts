import { Injectable, computed, signal } from '@angular/core';
import { Rol, Sesion } from './models';

const CLAVE = 'alturia.sesion';

/** Guarda la sesión en el dispositivo para que el mesero siga trabajando sin red (HU-16). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _sesion = signal<Sesion | null>(leer());
  sesion = this._sesion.asReadonly();
  autenticado = computed(() => this._sesion() !== null);

  guardar(s: Sesion): void {
    this._sesion.set(s);
    try { localStorage.setItem(CLAVE, JSON.stringify(s)); } catch { /* almacenamiento no disponible */ }
  }

  /** Sesión de pantalla del KDS: el administrador configura el televisor con /kds?token=... (sin usuario ni contraseña). */
  sesionPantallaCocina(token: string): void { this.guardar({ token, usuarioId: null, nombre: 'Pantalla de cocina', rol: 'COCINA' }); }

  cerrar(): void {
    this._sesion.set(null);
    try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  }

  tieneRol(...roles: Rol[]): boolean { const s = this._sesion(); return !!s && roles.includes(s.rol); }

  inicioPorRol(rol: Rol): string {
    return { MESERO: '/sala', CAJERO: '/caja', ADMINISTRADOR: '/admin', COCINA: '/kds' }[rol];
  }
}

function leer(): Sesion | null {
  try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) as Sesion : null; } catch { return null; }
}
