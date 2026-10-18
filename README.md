# AgendaT — Citas Multi-Negocio

Plataforma para publicar y gestionar citas de múltiples negocios (peluquerías, estudios, barberías, salones…). Los dueños crean su negocio, definen servicios, horarios y personal, y comparten un enlace público donde los clientes reservan. Un panel de administración global gestiona negocios, licencias, planes, códigos de pago, reseñas, notificaciones y configuración.

> App SPA: Next.js App Router + hash-router en cliente. Ver [Arquitectura](#arquitectura).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| ORM / DB | Prisma 6 sobre **SQLite** (`db/custom.db`) |
| Runtime / PKG | **Bun** (`bun.lock` es la fuente de verdad) |
| Estado (cliente) | Zustand (router, auth, datos) |
| Charts | Recharts · Drag&drop: dnd-kit · Animación: framer-motion |
| Notificaciones | Web Push (VAPID) + service worker · WhatsApp (`wa.me`) · Email (nodemailer/SMTP) |
| PWA | `manifest.json` + service worker (offline + push) |

## Funcionalidades

### Catálogo público (`/`)
- Listado de negocios con búsqueda, categorías, decoraciones, **rating (estrellas) y sello "Interfaz Certificada"**.
- Página de negocio (`#/negocio/[slug]`): hero con logo, servicios con precios/duración, **galería de trabajos en carrusel con lightbox**, horario, personal, reseñas públicas con estrellas, y **aviso de depósito** cuando el negocio lo exige.
- Reserva pública de citas (cliente anónimo con `customerHash`): selección de servicio(s), profesional, fecha/hora, datos de contacto.
- "Mis citas" (`#/mis-citas`): código de dispositivo, consultar/cancelar/reactivar citas y pedir reseña.
- Registro con **email + verificación por código OTP** y aceptación de [Términos y Condiciones](#/terminos); login/olvido de contraseña con reset por OTP.

### Panel del dueño (`#/negocio/[slug]/panel`)
- Gestión de servicios, personal, horarios y disponibilidad por día.
- Agenda con estados `pendiente | confirmada | cancelada | completada` (confirmar, completar, cancelar, reactivar).
- **Multi-servicio al agendar**: selección múltiple con totales (el API crea una cita encadenada por servicio).
- KPIs del negocio (visitas, citas, ingresos) ocultos en móvil con toggle.
- Galería de trabajos (hasta 4 fotos) y logo con **editor de imagen previo a la subida** (recorte cuadrado + zoom + preview).
- **Depósito por cita**: configurable (`depositEnabled` + monto); si está activo, el detalle de la cita muestra "Depósito recibido" (auto-confirma) en lugar de "Aceptar".
- **Licencia**: planes con códigos de pago de 6 dígitos que se envían por WhatsApp al asesor; trial automático en la creación (`trialDaysFirst` / `trialDaysExtra`, ambos configurables por admin).
- **Certificación**: los dueños pueden solicitar "Interfaz Certificada" desde su tab Licencia; el admin la aprueba y queda el sello en la página pública y en el panel.
- Botón **Compartir** (link público por WhatsApp, con fallback `execCommand`).
- Activación de **notificaciones push** y envío/recepción de mensajes WhatsApp.

### Admin (`#/admin`)
- Tabs (con **bottom-bar en móvil**): Dashboard, Negocios, Códigos de pago, Licencias, **Reseñas (moderación: editar/eliminar)**, SMTP, Ajustes.
- Crear/editar dueños y negocios; **cambiar contraseña** y **verificación manual** de email (badge Verde/Ámbar) cuando no hay SMTP configurado.
- Licencias: planes, precios, trials, **precio de certificación**, aplicar/rechazar códigos de pago (renovación de licencia).
- Configuración SMTP (host/puerto/usuario/contraseña/remite) para envío real de OTP.
- Ajustes globales: `supportPhone`, `certificationPrice`, `trialDaysFirst`, `trialDaysExtra`, `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFrom`.
- Aviso de soporte en el footer con número de WhatsApp (`+53 54719486`).

### PWA / Offline
- `public/manifest.json` + iconos (192/512/maskable/apple-touch), `themeColor` y metadata en `layout.tsx`.
- Service worker (`public/sw.js`): push + notificationclick, **caché offline de la SPA** (network-first en navegación, cache-first en estáticos/uploads) y botón **"Instalar app"** (`beforeinstallprompt`) en el header.
- ⚠️ Web Push y la instalación requieren **HTTPS o localhost**; en HTTP por IP de LAN el navegador no registra el SW.

### Seguridad / sesiones
- Sesión = cookie `agenda_session` (JSON en base64, **no JWT**; `next-auth` está instalado pero no se usa).
- Roles `admin` | `owner`; cada route de API valida con `requireAdmin()` / `requireOwner()` / `getSession()` a mano (no hay `middleware.ts`).
- **Gate de login**: dueño sin `emailVerified` → 403 `needsVerification` (flujo a `#/verificar-email`).
- OTP de 6 dígitos (`EmailOtp`): TTL 15 min, máx. 5 intentos, propósitos `register` | `reset` (reset también marca el email verificado). Dueños existentes quedaron verificados (grandfathered) y el seed crea los suyos verificados.
- Contraseñas en texto plano en DB (modelo actual del proyecto; no "arreglar" sin decisión explícita).
- Rate limiting por IP en los endpoints de auth.

---

## Arquitectura

**No sigue el default de Next.js.** Es una SPA con hash-router dentro de una única ruta de Next:

- Todo el enrutado vive en `src/app/page.tsx` + `src/lib/stores/router-store.ts` (zustand, `window.location.hash`; sin query strings — usar `sessionStorage` para pasar datos entre vistas).
- Las "vistas" son componentes en `src/components/agenda/views/` (`/`, `/negocio/[slug]`, `/negocio/[slug]/panel`, `/admin`, `/login`, `/register`, `/crear-negocio`, `/verificar-email`, `/forgot-password`, `/terminos`, `/mis-citas`).
- **Para agregar una pantalla**: registrar la ruta en `matchRoute()` (`router-store.ts`), el `case` en `src/app/page.tsx` y el componente en `views/`. **NO** crear `src/app/<ruta>/page.tsx`.
- Lo único server-side real: `src/app/api/**/route.ts` + `src/lib/{db,auth,datetime,otp,mailer,push,whatsapp}.ts`.
- Estado cliente en `src/lib/stores/` (`auth-store`, `router-store`, `data-store`…).

```
src/
├── app/
│   ├── page.tsx                 # shell único: switch de rutas hash
│   ├── layout.tsx               # metadata PWA, fonts, toasters
│   └── api/                     # REST (auth, businesses, appointments, owner/*,
│                                #  admin/*, reviews, push, upload, slots, visits…)
├── components/
│   ├── agenda/                  # AppShell, ImageField, VerifiedBadge,
│   │   └── views/               # CatalogView, BusinessView, BusinessPanel,
│   │                            #  AdminPanel, MisCitasView, VerifyEmailView…
│   └── ui/                      # shadcn/ui
├── lib/
│   ├── db.ts  auth.ts  otp.ts  mailer.ts  push.ts  whatsapp.ts  datetime.ts
│   └── stores/                  # zustand: router, auth, datos
prisma/schema.prisma             # modelo de datos (SQLite)
db/custom.db                     # base de datos (trackeada en git)
public/                          # sw.js, manifest.json, iconos, uploads/
scripts/seed.ts                  # seed inicial (upserts, seguro re-ejecutar)
tests/*.sh                       # harnesses de deploy (bash, bun falso)
.zscripts/dev.sh                 # arranque completo del entorno
```

---

## Requisitos

- [Bun](https://bun.sh) (runtime, instalación y scripts).
- Node solo si usas `npx` como alternativa (`./node_modules/.bin/*` funciona igual).

## Comandos

```bash
bun install                # instalar dependencias (bun.lock)
bun run dev                # next dev -H 0.0.0.0 :3000 → dev.log
bash .zscripts/dev.sh      # install → db:push → dev → health check :3000
bun run lint               # eslint .
bun run build              # next build + copia static/public a .next/standalone
bun run db:push            # prisma db push --accept-data-loss (SIN migraciones)
bun run db:generate        # regenerar cliente Prisma tras tocar schema
bun scripts/seed.ts        # seed (no hay script npm)
bash tests/database-runtime-build.sh   # tests de deploy
```

> **No hay script de typecheck ni framework de tests.** `tsc --noEmit` debe dar 0 errores en `src/` (excluye `examples/`). `next.config.ts` tiene `typescript.ignoreBuildErrors: true`.
> Si `bun` no está en el PATH: `./node_modules/.bin/{next,eslint,tsc,prisma}` o `npx`.

## Entorno / `.env`

```env
DATABASE_URL=file:../db/custom.db   # RELATIVA (se resuelve contra prisma/); no cambiarla a absoluta
```

- `src/lib/db.ts` normaliza `DATABASE_URL` a absoluta contra `<raíz>/db/custom.db` para que dev/standalone/otras máquinas usen siempre esa ruta.
- **SQLite `db/custom.db` está commiteado en git** (junto con `.env`).
- SMTP se configura **desde el panel Admin → SMTP** (no en `.env`). Plantilla Gmail: `smtp.gmail.com:465`, SSL, usuario `tu@gmail.com`, contraseña de aplicación. Sin SMTP, los OTP se crean en DB y el admin puede verificar manualmente.

## Seed / credenciales

```bash
bun scripts/seed.ts
```

| Rol | Usuario | Contraseña |
|---|---|---|
| Admin | `root` | `123` |
| Dueño | `estudio_aura` | `aura123` |
| Dueño | `kings_barber` | `kings123` |
| Dueño | `glamour_hair` | `glamour123` |

Son upserts → seguro de re-ejecutar (crea el admin con `role=admin` y 3 negocios con reseñas).

## Flujos de auth (OTP por email)

1. **Registro**: `POST /api/auth/register` → crea dueño (`emailVerified: false`) + envía OTP (`purpose: register`) → UI redirige a `#/verificar-email` (email en `sessionStorage: agenda_verify_email`).
2. **Verificar**: `POST /api/auth/verify-otp` → marca `emailVerified` y crea la sesión → `#/negocio/[slug]/panel`.
3. **Reenviar**: `POST /api/auth/resend-otp` (cooldown).
4. **Login**: `POST /api/auth/login` → dueño sin verificar responde `403 needsVerification`.
5. **Olvidó la contraseña**: `POST /api/auth/forgot-password` → OTP (`purpose: reset`) → `POST /api/auth/reset-password` (nueva contraseña + marca verificado).
6. **Manual**: Admin → Negocios → botón de verificación (cuando no hay SMTP).

## Deploy (sandbox)

- `.zscripts/build.sh` empaqueta `.next/standalone` + `public` + `db/custom.db` + `Caddyfile` en un tar; el runner ejecuta `start.sh` → `bun server.js` (:3000) y Caddy (:81 → :3000).
- **`output: "standalone"` en `next.config.ts` es obligatorio.**
- El build de deploy corre `db:push` contra el SQLite empaquetado.
- El runner solo tiene `bun` (+ `caddy`): no agregar servicios que dependan de `node`.

## LAN / desarrollo en móvil

- Dev server escucha en `0.0.0.0:3000` (accesible por LAN).
- Next 16 bloquea el HMR WS (`/_next/hmr`) con 403 si el `Origin` no está en `allowedDevOrigins` (`next.config.ts`, matchea **hostname sin protocolo/puerto**: `"192.168.*.*"`). Si cambia la subred de la máquina, actualizar la lista.
- Contexto no seguro (HTTP por IP): `crypto.randomUUID` y `navigator.clipboard` pueden no existir → la app ya usa fallbacks (`randomId()`, `execCommand('copy')`).

## Licencia / equipo

Proyecto privado — © [Dprimera-RY](https://github.com/Dprimera-RY/agendaT).
