import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConexionService } from './core/conexion.service';

/** Contenedor general: muestra el indicador de conexión en todas las pantallas (HU-16). */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (!conexion.servidor()) {
      <div class="banda alerta">Sin conexión con el restaurante: los pedidos se guardan en la tablet y se enviarán al recuperar la red.</div>
    } @else if (conexion.pendientes() > 0) {
      <div class="banda aviso">Enviando {{ conexion.pendientes() }} pedido(s) pendiente(s)…</div>
    }
    <router-outlet />
  `,
  styles: [`.banda{padding:.5rem 1rem;font-weight:600;text-align:center}.alerta{background:#fde7e5;color:#b3261e}.aviso{background:#fff1d6;color:#8a5200}`]
})
export class AppComponent {
  conexion = inject(ConexionService);
}
