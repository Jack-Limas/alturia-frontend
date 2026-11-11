import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineQueueService } from './offline-queue.service';

/**
 * Detecta si la tablet ve al servidor local (cada 5 s) y, al recuperar la conexión, envía los pedidos
 * pendientes en orden. El idLocal evita duplicados en el servidor (HU-16, HU-17).
 */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  private api = inject(ApiService);
  private cola = inject(OfflineQueueService);
  servidor = signal(true);
  pendientes = signal(0);
  private enviando = false;

  constructor() {
    this.verificar();
    setInterval(() => this.verificar(), 5000);
  }

  async verificar(): Promise<void> {
    try {
      await firstValueFrom(this.api.salud());
      const antes = this.servidor();
      this.servidor.set(true);
      if (!antes || this.pendientes() > 0) await this.enviarPendientes();
    } catch {
      this.servidor.set(false);
    }
    this.pendientes.set(await this.cola.contar());
  }

  async enviarPendientes(): Promise<void> {
    if (this.enviando) return;
    this.enviando = true;
    try {
      for (const p of await this.cola.listar()) {
        try {
          await firstValueFrom(this.api.crearPedido(p.pedido));
          await this.cola.quitar(p.idLocal);
        } catch (e) {
          if ((e as { status?: number }).status === 0) break;   // se cayó otra vez: se reintenta luego
          await this.cola.quitar(p.idLocal);                     // error de negocio: el servidor lo marcó para revisión
        }
      }
    } finally {
      this.enviando = false;
      this.pendientes.set(await this.cola.contar());
    }
  }
}
