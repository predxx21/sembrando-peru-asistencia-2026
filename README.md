# Sistemas de Asistencia - Sembrando Perú

Aplicación web para registro de asistencia/horas de voluntariado mediante cronómetro,
validación de coordinadores y reportes. Next.js (App Router) + Prisma/PostgreSQL + Supabase Auth.

📚 **[Documentación de Arquitectura](docs/ARQUITECTURA.md)** — Guía completa del sistema:
modelo de datos, flujos, optimizaciones y convenciones.

## Puesta en marcha desde cero (para un compañero)

El proyecto usa **pnpm** como gestor de paquetes (versión en el campo
`packageManager` de `package.json`) y **Node 22**. Cualquiera del equipo puede
clonarlo y correrlo así:

**1. Pre-requisitos**

```bash
node -v                 # usar Node 22 (LTS)
npm install -g pnpm@11.18.0
```

**2. Clonar y entrar**

```bash
git clone <URL-del-repo>
cd asistencia-sembrando-peru
git checkout main
```

**3. Variables de entorno** (obligatorio — están en `.gitignore`, así que **no
viajan en el clone**: hay que pedirlas al equipo o crear un proyecto propio en
Supabase)

```bash
cp .env.example .env        # completar DATABASE_URL y DIRECT_URL (PostgreSQL/Supabase)
cp .env.example .env.local  # completar NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SERVICE_ROLE_KEY
```

**4. Dependencias y base de datos**

```bash
pnpm install
npx prisma generate       # genera el cliente Prisma
npx prisma migrate deploy # aplica las migraciones (idempotente si usas la BD compartida)
```

**5. Levantar y probar**

```bash
pnpm run dev   # → http://localhost:3000
pnpm test      # Pruebas unitarias (Vitest): funciones puras de lib/utils
pnpm build     # Build de producción
```

**Notas para el compañero**

- Gestor único: **pnpm**. No usar `npm install` ni `yarn`.
- Al registrarse se crea el perfil como `voluntario`; para probar como admin se
  promueve con SQL en Supabase (ver §Roles y acceso).
- El proyecto usa **Next.js 16**, cuyas APIs pueden diferir de la documentación
  clásica; revisa `node_modules/next/dist/docs/` si algo no se comporta como
  esperas.

## Roles y acceso

- **voluntario**: ve `Panel`, `Historial` y registra horas. No ve Administración/Reportes.
- **admin** (coordinador de área): además ve `Administración` y `Reportes`, y aprueba/rechaza registros **solo de su área**.
- **coordinador_general**: ve `Administración` y `Reportes` de **todas las áreas** (acceso global).

El `rol` vive en `public.profiles` (`Profile.rol`). El login redirige por rol
(admin/coordinador_general → `/administracion`, resto → `/principal`). Las rutas del portal exigen
sesión; las rutas de admin además exigen `rol=admin` o `rol=coordinador_general` (la UI oculta esas
secciones y redirige a quienes no son admin; los endpoints de API también lo
validan y responden `403`).

### Crear un administrador

Todos los usuarios se registran como `voluntario`. Para promover a uno a admin
(aún no hay UI para esto), ejecútalo manualmente en la base:

**Opción A — SQL** (consola de Supabase → SQL Editor):

```sql
UPDATE "profiles"
SET rol = 'admin'
WHERE email = 'correo@sembrandoperu.org';  -- o WHERE id = '<uuid>'
```

> Nota sobre el nombre de la tabla: en el esquema Prisma la tabla de registros
> está mapeada a `registroasistencia` (no `attendance_records` como en la
> documentación antigua). Revisa siempre `prisma/schema.prisma` como fuente
> de verdad de nombres columnas/tablas.

## Estructura

```text
app/                Rutas (App Router), layout y estilos globales
app/api/            Route Handlers (auth, registros, admin/reportes, ...)
components/         UI: auth, layout (sidebar/topbar), volunteer, admin, history, reports
lib/auth/           Helpers de sesión y registro/login
lib/db/             Capa de datos con Prisma (perfil, registro, estadisticas, reportes)
lib/supabase/       Clientes de Supabase (browser, servidor)
lib/utils/          Funciones puras (horas, fechas, exportación, formatos) + tests
prisma/             Schema para Postgres
```

## Notas

- **Ui vs API**: la capa API valida sesión y rol con token Bearer en cada
  endpoint; la UI añade protección/ocultación por rol (guard del portal).
- **Exportación**: CSV y Excel-compatible (SpreadsheetML) sin dependencias
  externas (`lib/utils/exportar.js`).