import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';

/** Permite la ruta solo a los roles indicados (HU-01: «No tiene permisos para acceder a esta función»). */
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.autenticado()) return router.parseUrl('/login');
    if (auth.tieneRol(...roles)) return true;
    alert('No tiene permisos para acceder a esta función');
    return router.parseUrl(auth.inicioPorRol(auth.sesion()!.rol));
  };
}
