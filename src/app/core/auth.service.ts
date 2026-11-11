import { Injectable, computed, signal } from '@angular/core';
import { Rol, Sesion } from './models';

const CLAVE = 'alturia.sesion';

/**
 * Sesión del usuario.
 * - Cada pestaña recuerda su propia sesión (sessionStorage), así en un mismo navegador se pueden tener abiertos
 *   el KDS, la sala y la caja con roles distintos sin que una pestaña reemplace la sesión de otra.
 * - El dispositivo además guarda la última sesión iniciada (localStorage) para que el mesero siga trabajando
 *   sin red y al reabrir la tablet (HU-16). Las pestañas nuevas parten de esa sesión.
 * - La sesión de pantalla del KDS se guarda solo en su pestaña: no reemplaza la sesión del dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _sesion = signal<Sesion | null>(leer());
  sesion = this._sesion.asReadonly();
  autenticado = computed(() => this._sesion() !== null);

  guardar(s: Sesion, soloEstaPestana = false): void {
    this._sesion.set(s);
    escribir('pestana', s);
    if (!soloEstaPestana) escribir('dispositivo', s);
  }

  /** Sesión de pantalla del KDS: el administrador configura el televisor con /kds?token=... (sin usuario ni contraseña). */
  sesionPantallaCocina(token: string): void {
    this.guardar({ token, usuarioId: null, nombre: 'Pantalla de cocina', rol: 'COCINA' }, true);
  }

  cerrar(): void {
    const token = this._sesion()?.token;
    this._sesion.set(null);
    borrar('pestana');
    // Solo borra la sesión del dispositivo si es la misma de esta pestaña (no cierra la de otra pestaña).
    if (leerDe('dispositivo')?.token === token) borrar('dispositivo');
  }

  tieneRol(...roles: Rol[]): boolean { const s = this._sesion(); return !!s && roles.includes(s.rol); }

  inicioPorRol(rol: Rol): string {
    return { MESERO: '/sala', CAJERO: '/caja', ADMINISTRADOR: '/admin', COCINA: '/kds' }[rol];
  }

  nombreRol(rol: Rol): string {
    return { MESERO: 'Mesero', CAJERO: 'Caja', ADMINISTRADOR: 'Administrador', COCINA: 'Cocina' }[rol];
  }
}

type Almacen = 'pestana' | 'dispositivo';

/** El acceso a sessionStorage/localStorage puede lanzar error (modo privado, sitio bloqueado): siempre dentro de try. */
function almacen(a: Almacen): Storage { return a === 'pestana' ? sessionStorage : localStorage; }

function leer(): Sesion | null { return leerDe('pestana') ?? leerDe('dispositivo'); }

function leerDe(a: Almacen): Sesion | null {
  try { const t = almacen(a).getItem(CLAVE); return t ? JSON.parse(t) as Sesion : null; } catch { return null; }
}

function escribir(a: Almacen, s: Sesion): void {
  try { almacen(a).setItem(CLAVE, JSON.stringify(s)); } catch { /* almacenamiento no disponible */ }
}

function borrar(a: Almacen): void {
  try { almacen(a).removeItem(CLAVE); } catch { /* nada */ }
}
