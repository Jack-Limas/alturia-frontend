import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

/** Barra superior común con el nombre del módulo, el usuario y el botón de salir. */
@Component({
  selector: 'app-barra',
  standalone: true,
  template: `
    <header class="barra">
      <strong>Alturia · {{ titulo }}</strong>
      <div class="fila">
        <span>{{ auth.sesion()?.nombre }}</span>
        <button type="button" (click)="salir()">Salir</button>
      </div>
    </header>`
})
export class BarraComponent {
  @Input() titulo = '';
  auth = inject(AuthService);
  private router = inject(Router);
  salir(): void { this.auth.cerrar(); this.router.navigateByUrl('/login'); }
}
