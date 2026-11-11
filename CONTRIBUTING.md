# Cómo trabajamos en `alturia-frontend`

## Ramas
| Rama | Uso |
|---|---|
| `main` | Versiones entregables. Solo recibe merges desde `develop` al cierre de cada sprint (etiqueta `vX.Y.Z`). |
| `develop` | Integración. Recibe los PR de las ramas de trabajo. |
| `feature/juan/<hu>-<tema>` | Trabajo de Juan David Maya Benavides. Ej.: `feature/juan/hu32-pago-caja` |
| `feature/jack/<hu>-<tema>` | Trabajo de Jack Anderson Limas Solarte. Ej.: `feature/jack/hu08-reservas` |
| `fix/<persona>/<tema>` | Correcciones |

## Reglas que no se negocian
1. **Nunca** hagas push directo a `main` ni a `develop`. Todo entra por Pull Request (PR) a `develop`, revisado por el otro integrante.
2. **Commits pequeños y frecuentes**: un commit por archivo nuevo o por cambio lógico (aunque sea pequeño). Nada de un commit gigante.
3. Mensajes en español con **Conventional Commits**: `tipo(alcance): descripción en presente (HU-XX)`.
   Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `style`, `chore`, `build`, `ci`, `perf`.
4. **Solo toca los archivos de tu propiedad** (tabla de propietarios). Si necesitas un cambio en un archivo del otro, pídelo en el PR o en Trello.
5. Antes de empezar cada rama: `git switch develop && git pull`. Antes de abrir el PR: `git fetch && git rebase origin/develop`.
6. Haz `git push` después de cada 3–5 commits para que el avance quede visible en GitHub.
7. Antes de cada PR ejecuta las pruebas del repositorio y verifica que el CI quede en verde.
8. Enlaza la tarjeta de Trello de la HU en la descripción del PR y muévela a «En revisión».

## Propietarios de archivos (para que los commits no se crucen)
| Ruta | Propietario |
|---|---|
| Configuración (`package.json`, `angular.json`, `tsconfig*`, `ngsw-config.json`, `.github/`), `src/main.ts`, `src/styles.css`, `src/app/app.*`, `shared/`, `features/login`, `features/sala`, `features/kds`, `features/admin`, `README.md`, `docs/` | Jack |
| `src/app/core/`, `features/caja/` y la línea de la ruta `/caja` en `app.routes.ts` | Juan |


## Flujo de un cambio
```bash
git switch develop && git pull
git switch -c feature/<persona>/<hu>-<tema>
# ...cambios pequeños...
git add <archivo> && git commit -m "feat(alcance): descripción (HU-XX)"
git push -u origin feature/<persona>/<hu>-<tema>
# abrir PR a develop (GitHub web o: gh pr create --base develop --fill)
```
Pruebas antes del PR: `npm run build`

## Configuración inicial de cada integrante
```bash
git config user.name  "Nombre Apellido"     # el de tu cuenta de GitHub
git config user.email "correo@de-tu-github"  # para que los commits cuenten en tu perfil
```
