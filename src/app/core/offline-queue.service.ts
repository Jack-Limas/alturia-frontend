import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Mesa, PedidoRequest, Producto } from './models';

export interface PedidoPendiente { idLocal: string; pedido: PedidoRequest; creado: number; mesaNumero: number; }

/** Almacenamiento interno de la tablet (IndexedDB con Dexie): pedidos sin enviar y copia del catálogo (HU-16, HU-17). */
class AlturiaDB extends Dexie {
  pendientes!: Table<PedidoPendiente, string>;
  catalogo!: Table<{ clave: string; valor: unknown }, string>;
  constructor() {
    super('alturia');
    this.version(1).stores({ pendientes: 'idLocal, creado', catalogo: 'clave' });
  }
}

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private db = new AlturiaDB();

  guardar(p: PedidoRequest, mesaNumero: number): Promise<string> {
    return this.db.pendientes.put({ idLocal: p.idLocal, pedido: p, creado: Date.now(), mesaNumero });
  }
  /** En el orden en que fueron confirmados. */
  listar(): Promise<PedidoPendiente[]> { return this.db.pendientes.orderBy('creado').toArray(); }
  quitar(idLocal: string): Promise<void> { return this.db.pendientes.delete(idLocal); }
  contar(): Promise<number> { return this.db.pendientes.count(); }

  async guardarCatalogo(productos: Producto[], mesas: Mesa[]): Promise<void> {
    await this.db.catalogo.bulkPut([{ clave: 'productos', valor: productos }, { clave: 'mesas', valor: mesas }]);
  }
  async productos(): Promise<Producto[]> { return ((await this.db.catalogo.get('productos'))?.valor as Producto[]) ?? []; }
  async mesas(): Promise<Mesa[]> { return ((await this.db.catalogo.get('mesas'))?.valor as Mesa[]) ?? []; }
}
