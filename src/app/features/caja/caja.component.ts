import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError } from '../../core/api.service';
import { CuentaDto, PagoDto } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { BarraComponent } from '../../shared/barra.component';
import { MonedaPipe } from '../../shared/moneda.pipe';
import { calcularPago } from './calculo-pago';

type Medio = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

/**
 * Módulo de caja (HU-31, HU-32): el cajero(a) muestra la cuenta al cliente y registra el pago recibido en persona.
 * No hay conexión con bancos: la transferencia se verifica en persona y solo se digita su referencia.
 */
@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [FormsModule, BarraComponent, MonedaPipe],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.css'
})
export class CajaComponent implements OnInit {
  private api = inject(ApiService);
  private rt = inject(RealtimeService);
  cuentas = signal<CuentaDto[]>([]);
  actual = signal<CuentaDto | null>(null);
  medio = signal<Medio>('EFECTIVO');
  efectivo = signal<number | null>(null);
  transferencia = signal<number | null>(null);
  referencia = signal('');
  resultado = signal<PagoDto | null>(null);
  error = signal<string | null>(null);
  enviando = signal(false);

  calculo = computed(() => {
    const c = this.actual();
    if (!c) return null;
    const m = this.medio();
    const t = m === 'EFECTIVO' ? 0 : m === 'TRANSFERENCIA' ? c.total : (this.transferencia() ?? 0);
    const e = m === 'TRANSFERENCIA' ? 0 : (this.efectivo() ?? 0);
    return calcularPago(c.total, e, t);
  });
  puedeRegistrar = computed(() => {
    const k = this.calculo();
    if (!k || k.error || k.saldoPendiente > 0 || this.enviando()) return false;
    return this.medio() === 'EFECTIVO' || this.referencia().trim().length > 0;
  });

  ngOnInit(): void {
    this.cargar();
    this.rt.escuchar('/topic/kds').subscribe(() => this.cargar());
  }

  cargar(): void {
    this.api.cuentas().subscribe({ next: cs => this.cuentas.set(cs), error: e => this.error.set(mensajeError(e)) });
  }

  seleccionar(c: CuentaDto): void {
    this.resultado.set(null); this.error.set(null);
    this.medio.set('EFECTIVO'); this.efectivo.set(null); this.transferencia.set(null); this.referencia.set('');
    this.api.cuenta(c.mesaId).subscribe({ next: d => this.actual.set(d), error: e => this.error.set(mensajeError(e)) });
  }

  registrar(): void {
    const c = this.actual(), k = this.calculo();
    if (!c || !k) return;
    const m = this.medio();
    this.enviando.set(true);
    this.api.pagar(c.mesaId, {
      efectivoRecibido: m === 'TRANSFERENCIA' ? null : this.efectivo(),
      valorTransferencia: m === 'EFECTIVO' ? null : m === 'TRANSFERENCIA' ? c.total : this.transferencia(),
      referenciaTransferencia: m === 'EFECTIVO' ? null : this.referencia().trim()
    }).subscribe({
      next: r => { this.resultado.set(r); this.enviando.set(false); this.actual.set(null); this.cargar(); },
      error: e => { this.error.set(mensajeError(e)); this.enviando.set(false); }
    });
  }

  imprimir(): void { window.print(); }
}
