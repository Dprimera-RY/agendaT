# AGENTS.md

## Qué es

App de citas multi-negocio ("AgendaPro"): Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui + Prisma 6 sobre **SQLite**. Runtime y package manager: **bun** (`bun.lock` es la fuente de verdad; ignora `yarn.lock`, no está trackeado). Path alias `@/*` → `src/*`.

## Arquitectura (no sigue el default de Next)

- Es un **SPA con hash-router dentro de una única ruta de Next**: todo el "enrutado de páginas" vive en `src/app/page.tsx` + `src/lib/stores/router-store.ts` (zustand, `window.location.hash`). Las "vistas" (`/`, `/negocio/[slug]`, `/negocio/[slug]/panel`, `/admin`, `/login`, `/register`, `/crear-negocio`) son componentes en `src/components/agenda/views/`.
- **Para agregar una pantalla**: registrar la ruta en `matchRoute()` (`src/lib/stores/router-store.ts`), el case en `src/app/page.tsx` y el componente en `views/`. NO crear archivos en `src/app/<ruta>/page.tsx` (no se usan).
- Lo único server-side real es la API en `src/app/api/**/route.ts` + `src/lib/{db,auth,datetime}.ts`. El estado cliente vive en `src/lib/stores/`.
- `mini-services/` permite sidecars Bun (cada subcarpeta con `package.json` y `src/index.ts`); actualmente vacío. `examples/` está excluido del lint y tiene deps faltantes: no lo tocar como referencia.

## Comandos

```bash
bun install
bun run dev        # next dev -H 0.0.0.0 :3000 (accesible por LAN), log a dev.log
bun run lint       # eslint .
bun run build      # next build + copia static/public a .next/standalone
bun run db:push    # prisma db push --accept-data-loss
bun run db:generate
```

- Arranque completo del entorno: `bash .zscripts/dev.sh` (install → db:push → dev → health check en :3000).
- **No hay script de typecheck ni framework de tests.** `next.config.ts` tiene `typescript.ignoreBuildErrors: true`; `tsc --noEmit` da **0 errores en `src/`** (excluye `examples/` con `grep -v '^examples/'`); no agregues más.
- `bun run lint` **ya falla hoy** con 3 errores `react-hooks/set-state-in-effect` en `views/BusinessView.tsx`, `ui/carousel.tsx` y `hooks/use-mobile.ts`. No son regresión de tus cambios; verifica solo que no aumenten.
- `tests/*.sh` son harnesses bash de los scripts de deploy (usan un `bun` falso): `bash tests/database-runtime-build.sh`.
- Seed (no hay script npm): `bun scripts/seed.ts` → admin `root/123`, dueños `estudio_aura/aura123`, `kings_barber/kings123`, `glamour_hair/glamour123`. Son upserts, es seguro re-ejecutar.
- Si `bun` no está en el PATH, usa `./node_modules/.bin/{tsc,eslint,next,prisma}` o `npx`. `web-push` se instaló vía `npm install` en un dir temporal y se copió a `node_modules` (npm del proyecto se cuelga con el árbol completo); está listado en `package.json`.

## Base de datos

- SQLite en `db/custom.db`, **commiteado en git**. `.env` (también trackeado) contiene `DATABASE_URL=file:/ruta/absoluta/a/custom.db`: es una ruta de esta máquina; si falla, apunta al `db/custom.db` local.
- **No existe `prisma/migrations`**: los cambios de schema van con `bun run db:push` (acepta pérdida de datos). Después de tocar `prisma/schema.prisma`, corre `bun run db:generate`.

## Auth

- Sesión = cookie `agenda_session` con JSON en base64 (no es JWT; `next-auth` está en dependencias pero **no se usa**). Helpers server: `src/lib/auth.ts` (`getSession`, `requireAdmin`, `requireOwner`); cliente: `src/lib/stores/auth-store.ts`.
- No hay `middleware.ts`: cada route de API valida con `requireAdmin()`/`getSession()` a mano. Roles: `admin` | `owner`. Contraseñas en texto plano en DB (modelo actual, no "arreglar" sin decisión del usuario).

## Notificaciones push (Web Push + VAPID)

- Infra: `src/lib/push.ts` (claves VAPID auto-generadas en `Setting`, `pushToOwner`/`pushToCustomer` con `web-push`), `public/sw.js` (push + notificationclick), APIs `api/push/{vapid-key,subscribe,unsubscribe}`, cliente en `src/components/agenda/PushRegistrar.tsx` (`useServiceWorker` corre en `AppShell`; `PushEnableButton` en panel dueño, tras agendar y en Mis citas).
- Modelo `PushSubscription` (`targetType`: owner|customer, `targetId`: ownerId|customerHash). Los envíos automáticos están en `api/appointments` (POST → push al dueño; PATCH → push al cliente con cambios de estado/fecha; cancel/reactivar del cliente → push al dueño).
- **Web Push requiere HTTPS o localhost**: sobre HTTP por IP local (LAN) el navegador no registra el service worker; el botón simplemente no aparece/funciona sin contexto seguro.

## WhatsApp (links wa.me)

- `src/lib/whatsapp.ts` centraliza mensajes y `waLink(phone, text)`. Las APIs de citas devuelven el link listo: POST → `whatsappNotification.link` (al dueño); PATCH staff → `customerNotification.link` (al cliente); PATCH cliente → `ownerWhatsappLink`.
- El dueño genera **códigos de pago** de 6 dígitos (`PaymentCode`, `api/owner/payment-codes`) al elegir un plan en su tab Licencia y se abre WhatsApp del asesor con el mensaje; el admin lo aplica en tab Licencias → "Códigos de pago" (`api/admin/payment-codes`: POST aplica y renueva licencia, PATCH rechaza).

## Citas: reglas de negocio

- Estados: pendiente | confirmada | cancelada | completada. **Canceladas se pueden reactivar**: dueño/admin → PATCH `{status:'pendiente'}` (libre); cliente anónimo con `customerHash` → también, con validación de conflicto de horario (409 si ocupado). La UI lo permite desde el detalle del panel y desde "Mis citas".

## Deploy (sandbox) — gotchas críticos

- El deploy usa `.zscripts/build.sh`: empaqueta `.next/standalone` + `public` + `db/custom.db` + `Caddyfile` en un tar para un runner donde `start.sh` levanta `bun server.js` (:3000) y Caddy (:81 → :3000).
- **`output: "standalone"` en `next.config.ts` es obligatorio.** Si lo borras, el build sigue saliendo con exit 0 pero sin `.next/standalone/server.js` y el deploy falla en runtime (build.sh intenta autoinyectarlo y re-build).
- El build de deploy corre `db:push` contra la copia del SQLite empaquetado; si no hay `db/custom.db` crea una vacía.
- No agregues servicios que dependan de `node` en el runner: la imagen ejecuta todo con `bun` (y `caddy`).

## Convenciones

- Comentarios, strings de UI y mensajes de error del repo están en **español**; mantenlos así.
- `eslint.config.mjs` tiene casi todas las reglas apagadas (`any`, `console`, `no-unused-vars`, `exhaustive-deps`...): el lint no es un guía de estilo, no lo "arregles" re-habilitando reglas.
- `reactStrictMode: false` y `PrismaClient` con `log: ['query']` en `src/lib/db.ts` (singleton en `globalThis`).
