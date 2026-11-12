import { Pipe, PipeTransform } from '@angular/core';

/** Pesos colombianos sin decimales: 45000 → $45.000 */
@Pipe({ name: 'moneda', standalone: true })
export class MonedaPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return '$' + Math.round(Number(v ?? 0)).toLocaleString('es-CO');
  }
}
