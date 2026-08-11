# Sistemas de Asistencia - Sembrando Perú

Aplicación web para registro de asistencia/horas de voluntariado, con evidencias,
validación de coordinadores y reportes. Next.js (App Router) + Prisma/PostgreSQL + Supabase Auth/Storage.

## Ejecutar el proyecto

El proyecto usa **pnpm** como gestor de paquetes (versión en el campo
`packageManager` de `package.json`). Si no lo tienes: `npm install -g pnpm`.

```bash
pnpm install
pnpm run dev
```

Abre `http://localhost:3000`. Se necesitan las variables de entorno:

- `.env` → `DATABASE_URL` y `DIRECT_URL` (PostgreSQL)
- `.env.local` → claves de Supabase (URL, publishable key y service role)

Hay una plantilla `.env.example` con todas las variables documentadas.

```bash
pnpm test        # Pruebas unitarias (Vitest): funciones puras de lib/utils
pnpm build       # Build de producción
```

## Roles y acceso

- **voluntario**: ve `Panel`, `Historial` y registra horas. No ve Administración/Reportes.
- **admin** (coordinador): además ve `Administración` y `Reportes`, y aprueba/rechaza registros.

El `rol` vive en `public.profiles` (`Profile.rol`). El login redirige por rol
(admin → `/administracion`, resto → `/principal`). Las rutas del portal exigen
sesión; las rutas de admin además exigen `rol=admin` (la UI oculta esas
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
lib/supabase/       Clientes de Supabase (browser, servidor, storage)
lib/utils/          Funciones puras (horas, fechas, exportación, formatos) + tests
prisma/             Schema para Postgres
```

## Notas

- **Ui vs API**: la capa API valida sesión y rol con token Bearer en cada
  endpoint; la UI añade protección/ocultación por rol (guard del portal).
- **Exportación**: CSV y Excel-compatible (SpreadsheetML) sin dependencias
  externas (`lib/utils/exportar.js`).