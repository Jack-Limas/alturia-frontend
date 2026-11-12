import { Injectable, NgZone, inject, signal } from '@angular/core';

/** Dictado con el reconocimiento de voz del navegador (Web Speech API). Si no está disponible, el mesero escribe (HU-22). */
@Injectable({ providedIn: 'root' })
export class VozService {
  private zone = inject(NgZone);
  escuchando = signal(false);
  private Reconocedor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  disponible(): boolean { return !!this.Reconocedor && navigator.onLine; }

  dictar(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.disponible()) { reject(new Error('El dictado no está disponible en este momento. Escriba el pedido')); return; }
      const r = new this.Reconocedor();
      r.lang = 'es-CO';
      r.interimResults = false;
      r.maxAlternatives = 1;
      this.escuchando.set(true);
      r.onresult = (ev: any) => this.zone.run(() => resolve(ev.results[0][0].transcript as string));
      r.onerror = () => this.zone.run(() => reject(new Error('El dictado no está disponible en este momento. Escriba el pedido')));
      r.onend = () => this.zone.run(() => this.escuchando.set(false));
      r.start();
    });
  }
}
