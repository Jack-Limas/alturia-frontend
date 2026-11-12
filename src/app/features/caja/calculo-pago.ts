/** Misma regla que CajaService.calcular en el backend, para mostrar el cambio mientras se digita (HU-32). */
export interface Calculo { saldoPendiente: number; cambio: number; medio: 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO'; error: string | null; }

export function calcularPago(total: number, efectivoRecibido: number, transferencia: number): Calculo {
  const e = Math.max(0, efectivoRecibido || 0);
  const t = Math.max(0, transferencia || 0);
  if (t > total) return { saldoPendiente: 0, cambio: 0, medio: 'TRANSFERENCIA', error: 'La transferencia no puede superar el total de la cuenta' };
  const restante = total - t;
  const cubierto = t + Math.min(e, restante);
  return {
    saldoPendiente: Math.max(0, total - cubierto),
    cambio: Math.max(0, e - restante),
    medio: t > 0 && restante > 0 ? 'MIXTO' : t > 0 ? 'TRANSFERENCIA' : 'EFECTIVO',
    error: null
  };
}
