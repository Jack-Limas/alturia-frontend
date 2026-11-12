import { Injectable, OnDestroy } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { Observable, map } from 'rxjs';

/** Tiempo real por la red local (STOMP sobre WebSocket en /ws del servidor local). */
@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private stomp = new RxStomp();

  constructor() {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    this.stomp.configure({ brokerURL: `${protocolo}://${location.host}/ws`, reconnectDelay: 3000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000 });
    this.stomp.activate();
  }

  escuchar<T>(topico: string): Observable<T> {
    return this.stomp.watch(topico).pipe(map(m => JSON.parse(m.body) as T));
  }

  ngOnDestroy(): void { this.stomp.deactivate(); }
}
