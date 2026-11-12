import { Routes } from '@angular/router';
import { rolGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: 'sala', canActivate: [rolGuard('MESERO', 'ADMINISTRADOR')],
    loadComponent: () => import('./features/sala/mesas.component').then(m => m.MesasComponent) },
  { path: 'sala/mesa/:mesaId', canActivate: [rolGuard('MESERO', 'ADMINISTRADOR')],
    loadComponent: () => import('./features/sala/pedido.component').then(m => m.PedidoComponent) },
  { path: 'kds', loadComponent: () => import('./features/kds/kds.component').then(m => m.KdsComponent) },
  { path: 'admin', canActivate: [rolGuard('ADMINISTRADOR')],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
