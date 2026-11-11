# alturia-frontend

Interfaces del **Sistema de Gestión de Pedidos Alturia** (trabajo de grado, Ingeniería de Software, UCC Pasto):
una sola aplicación Angular con cuatro módulos, uno por rol, que se sirve desde el servidor local del restaurante.

- **Autores:** Jack Anderson Limas Solarte (Product Owner · frontend · UI/UX) y Juan David Maya Benavides (Scrum Master · backend · NLP)
- **Repositorios del sistema:** `alturia-backend` · `alturia-frontend` (este) · `alturia-nlp`

## 1. Módulos
| Ruta | Quién lo usa | Dispositivo | Historias |
|---|---|---|---|
| `/login` | Todos | — | HU-01 |
| `/sala` y `/sala/mesa/:id` | Mesero | Tablet (PWA instalable) | HU-05, HU-07, HU-13 a HU-16, HU-19, HU-22 a HU-24 |
| `/kds?token=…&estacion=Cocina` | Personal de cocina | Smart TV + **teclado numérico USB** (no táctil) | HU-18, HU-25 a HU-30 |
| `/caja` | Cajero(a) | Navegador del computador de la caja | HU-31, HU-32 |
| `/admin` | Administrador | Navegador | HU-02 a HU-04, HU-06 (reservas y reportes: pendientes) |

### Teclado numérico del KDS
| Tecla | Acción |
|---|---|
| 8 / 2 | Pedido anterior / siguiente |
| 4 / 6 | Vista Cocina · Bar · Consolidado |
| Enter | Avanzar estado: Recibido → En preparación → Listo |
| 0 | Deshacer el último cambio (10 s) |
| + / − | Confirmar / cancelar la verificación de alérgenos |
| . | Reimprimir la comanda |

## 2. Cómo funciona sin internet
- Todo habla con el **servidor local** (`alturia-backend`) por la red Wi-Fi del restaurante; internet no es necesario.
- Si la tablet pierde la red local: el pedido manual se guarda en **IndexedDB (Dexie)** con un `idLocal` único y se envía solo
  cuando vuelve la conexión (`ConexionService` consulta `/api/salud` cada 5 s). El servidor no lo duplica.
- La copia del menú y las mesas queda en la tablet para consultar sin red. El Service Worker de Angular guarda la aplicación.
- El dictado usa la Web Speech API del navegador; si no está disponible, el mesero escribe.

## 3. Tecnologías
Angular 18 (componentes standalone, signals, control flow) · @stomp/rx-stomp (WebSocket/STOMP) · Dexie 4 (IndexedDB) · @angular/service-worker (PWA).

## 4. Estructura
```
src/app
├── core/                 (Juan) contratos, API, sesión, guardas, tiempo real, cola sin conexión
├── shared/               (Jack) barra superior, pipe de moneda
└── features/
    ├── login/            (Jack) HU-01
    ├── sala/             (Jack) mesas, toma de pedidos manual y en lenguaje natural, dictado
    ├── kds/              (Jack) pantalla de cocina con teclado numérico
    ├── caja/             (Juan) cuenta y pago presencial (efectivo, transferencia, mixto)
    └── admin/            (Jack) menú, mesas, usuarios
```

## 5. Ejecutar en desarrollo
Requisitos: Node 20+ y el backend corriendo en `localhost:8080` (y el NLP en `localhost:8000`).
```bash
npm install
npm start            # http://localhost:4200 (proxy de /api y /ws hacia el backend)
```
Usuarios de prueba: `mesero/mesero12345`, `caja/caja12345`, `admin/admin12345`.
KDS: `http://localhost:4200/kds?token=kds-cocina-alturia` (use el teclado numérico o las flechas).

## 6. Desplegar en el restaurante
```bash
npm run build
cp -r dist/alturia-frontend/browser/* ../alturia-backend/src/main/resources/static/
```
Luego el servidor local sirve todo: tablets → `http://<ip-caja>:8080/sala`, televisor → `http://<ip-caja>:8080/kds?token=...`,
caja → `http://localhost:8080/caja`. En la tablet, «Agregar a la pantalla de inicio» instala la PWA.

## 7. Cómo trabajamos
Ramas `main` / `develop` / `feature/<persona>/<hu>-<tema>`, commits pequeños con Conventional Commits en español y PR revisado por
el otro integrante. Propietarios por carpeta y reglas completas en [CONTRIBUTING.md](CONTRIBUTING.md). Pendientes en
[docs/BACKLOG.md](docs/BACKLOG.md). Wireframes de cada historia de usuario: ver el entregable de wireframes del proyecto.
