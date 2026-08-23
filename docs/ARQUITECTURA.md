# 📚 Documentación de Arquitectura — Asistencia Sembrando Perú

Sistema web para registro de asistencia/horas de voluntariado mediante **cronómetro**,
con validación de coordinadores y reportes administrativos.

---

## 🏗️ STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Lenguaje** | JavaScript (JSX) + TypeScript en configuración |
| **Base de datos** | PostgreSQL (Supabase) vía Prisma ORM |
| **Auth** | Supabase Auth (JWT en header `Authorization: Bearer`) |
| **Caché** | En memoria (`Map` en `globalThis`, TTL por endpoint) |
| **Tests** | Vitest (funciones puras de `lib/utils`) |
| **Estilos** | CSS Modules + variables globales |
| **Gestor de paquetes** | pnpm |

---

## 📂 ESTRUCTURA DE DIRECTORIOS

```
app/
├── (portal)/           # Rutas protegidas por CheckProfile (portal autenticado)
│   ├── principal/       # Dashboard voluntario (PanelVoluntario)
│   ├── formulario-horas/ # Cronómetro (RegistrarHoras + Cronometro)
│   ├── historial/       # Historial + detalle + edición
│   ├── administracion/  # Panel admin (AdminDashboard + auditoría)
│   ├── reportes/        # Reportes consolidados
│   └── editar-perfil/   # Edición de perfil
├── api/                 # Route Handlers (Backend API)
│   ├── auth/            # me, perfil
│   ├── registros/       # CRUD registros + sesion-activa + [id]/corregir
│   ├── admin/           # usuarios, estadisticas, reportes, auditoria
│   └── areas/           # Lista de áreas (dinámica desde BD)
├── registro/            # Página de registro (signUp)
├── login/               # Login
└── layout.jsx           # Layout raíz

components/
├── auth/                # Login, Register, Recuperar, Restablecer
├── layout/              # Sidebar, Topbar, CheckProfile, PortalAuthProvider
├── volunteer/           # PanelVoluntario, RegistrarHoras, Cronometro, EditarPerfil
├── admin/               # AdminDashboard, AuditLog, WeeklyVolumeChart
├── history/             # ListadoHistorial, VerDetalle, CorregirActividad, Loaders
├── reports/             # Reportes, Pagination, SummaryCard, WeeklyHoursChart, ExportarReporte
└── reports/             # Pagination reutilizable

lib/
├── api/                 # Cliente fetch con token
├── auth/                # Helpers de sesión (login, register, sesion)
├── cache.js             # Caché en memoria con TTL
├── constantes.js        # AREAS (fallback), UMBRALES
├── db/
│   ├── client.js        # Singleton PrismaClient
│   ├── perfil.js         # CRUD perfil + caché
│   ├── registro.js       # CRUD registros + sesión activa
│   ├── areas.js          # CRUD áreas (tabla dinámica)
│   ├── estadisticas.js   # Agregaciones para dashboard
│   ├── reportes.js       # Reportes consolidados ($queryRaw)
│   └── usuarios.js       # Gestión de usuarios (admin)
├── supabase/
│   ├── client.js         # Cliente browser (supabase-js)
│   └── authServer.js     # getUserFromRequest (verifica JWT)
└── utils/               # horas, fecha, validar, exportar, estado, reportesFormato

prisma/
├── schema.prisma        # Esquema de BD
├── migrations/          # Migraciones SQL
└── scripts/             # Scripts de migración de datos (no usar en prod)
```

---

## 🔄 FLUJO DE DATOS: CRONÓMETRO

```
┌─────────────────────────────────────────────────────────────────┐
│                       VOLUNTARIO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PanelVoluntario (principal)                                  │
│     └─ GET /api/auth/perfil → muestra nombre + área             │
│                                                                  │
│  2. FormularioHoras (formulario-horas)                          │
│     ├─ GET /api/registros/sesion-activa → ¿hay sesión abierta?  │
│     ├─ Cronometro inicia → POST /api/registros/sesion-activa   │
│     │   └─ Crea registro con sesionActiva=true, horaInicioReal │
│     └─ Cronometro termina → PATCH /api/registros/sesion-activa  │
│         └─ Calcula horas, cierra registro (sesionActiva=false)  │
│                                                                  │
│  3. Historial (historial)                                       │
│     └─ GET /api/registros?scope=mine → lista registros          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ADMINISTRADOR                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AdminDashboard (administracion)                                │
│    ├─ GET /api/admin/estadisticas → resumen + tendencia + audit │
│    ├─ GET /api/registros?estado=pendiente → lista por aprobar   │
│    └─ PATCH /api/registros/[id] → aprobar/rechazar              │
│         └─ Guarda revisorId, comentarioRevision, fechaRevision  │
│                                                                  │
│  Reportes (reportes)                                            │
│    └─ GET /api/admin/reportes → agregados por voluntario        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 MODELO DE DATOS

### Tabla `profiles`
```sql
id            UUID (PK, del usuario Supabase)
nombre        TEXT
apellido      TEXT
rol           ENUM ('voluntario', 'admin')
areaId        UUID? (FK → areas.id, nullable)
area          Relation → Area
fechaCreacion TIMESTAMP
```

### Tabla `areas` (NUEVA — Dinámica)
```sql
id            UUID (PK)
nombre        TEXT (UNIQUE)
descripcion   TEXT?
activa        BOOLEAN (default true)
orden         INT (para ordenar en selects)
fechaCreacion TIMESTAMP
```
**Para agregar una nueva área:** Solo INSERT en `areas` (vía SQL o endpoint admin).
No requiere cambios de código. El frontend la carga automáticamente.

### Tabla `registroasistencia`
```sql
id                INT (PK, autoincrement)
profileId         TEXT (FK → profiles.id)
fecha             DATE
horaInicio        TEXT ("HH:MM" legible)
horaFin           TEXT
horas             FLOAT
descripcion       TEXT
evidenciaUrl      TEXT? (LEGACY — ya no se usa, mantenido por compatibilidad)
estado            ENUM ('pendiente', 'aprobado', 'rechazado')
sesionActiva      BOOLEAN (default false) — para cronómetro
horaInicioReal    TIMESTAMP? — timestamp exacto de "Iniciar"
comentarioRevision TEXT? — comentario de rechazo
revisorId         TEXT? (FK → profiles.id, nullable)
fechaRevision     TIMESTAMP?
```

### Índices (CRÍTICOS para rendimiento)
```sql
-- Búsqueda de sesión activa (HOT PATH en cada carga de formulario)
CREATE INDEX ON registroasistencia(profileId, sesionActiva);

-- Auditoría por revisor
CREATE INDEX ON registroasistencia(revisorId);

-- Auditoría completa filtrada por estado
CREATE INDEX ON registroasistencia(estado, fechaRevision);

-- Historial filtrado por estado
CREATE INDEX ON registroasistencia(profileId, estado);

-- Filtros del panel admin
CREATE INDEX ON registroasistencia(profileId);
CREATE INDEX ON registroasistencia(estado);
CREATE INDEX ON registroasistencia(fecha);
CREATE INDEX ON registroasistencia(fechaRevision);
CREATE INDEX ON registroasistencia(estado, fecha);
```

---

## ⚡ OPTIMIZACIONES DE RENDIMIENTO

### Caché en memoria (`lib/cache.js`)
- **TTL corto** (30-60s) por endpoint
- **Invalidación explícita** en escrituras (`invalidateCache()`)
- **Vive en `globalThis`** → sobrevive hot-reload en dev
- **Límite de 500 entradas** → evita memory leak en serverless

**Endpoints cacheados:**
| Endpoint | TTL | Invalidado por |
|----------|-----|----------------|
| `/api/admin/estadisticas` | 60s | POST/PATCH/DELETE en registros |
| `/api/admin/reportes` | 60s | POST/PATCH/DELETE en registros |
| `/api/admin/auditoria` | 60s | PATCH en registros (aprobar/rechazar) |
| `/api/registros/[id]` | 60s | PATCH en ese registro (admin o voluntario) |
| `/api/registros` | 30s | POST nuevo registro, PATCH corregir |
| `/api/auth/perfil` | 30s | PATCH perfil |

### $queryRaw agregado (Reportes/Estadísticas)
En lugar de 5 round-trips a la BD, **una sola query** con 3 subconsultas:
```sql
SELECT
  COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
  COALESCE(SUM(horas) FILTER (WHERE estado = 'aprobado'), 0) AS horas_aprobadas,
  ...
FROM registroasistencia;
```
**Resultado:** ~1.3s → ~0.17s en primera carga.

### Paginación compacta (`components/reports/Pagination.jsx`)
- Muestra: `1 2 ... penúltimo último`
- Ventana de 2 páginas alrededor de la actual
- Ellipsis (`...`) para páginas intermedias
- Reutilizado en: Historial, Admin Dashboard, Reportes

---

## 🔐 SEGURIDAD

### Autenticación
- **Supabase Auth** emite JWT
- **`getUserFromRequest()`** verifica el token en cada Route Handler
- **`getPerfilByUserId()`** obtiene el perfil (con rol) del token `user.id`

### Autorización
| Acción | Rol requerido |
|--------|---------------|
| Crear/editar perfil propio | Autenticado |
| Registrar horas (cronómetro) | Autenticado + `profile.areaId` asignado |
| Ver historial propio | Autenticado (solo `scope=mine`) |
| Aprobar/rechazar registros | `rol = admin` |
| Ver reportes/estadísticas | `rol = admin` |
| Crear áreas | `rol = admin` (pendiente) |

### Protección IDOR
- **`/api/auth/perfil`** ignora `?id=` (siempre usa `user.id` del token)
- **`/api/registros/[id]`** verifica que `registro.profileId === user.id` O `rol = admin`
- **`/api/registros/[id]/corregir`** verifica que el dueño del registro lo corrija

### Sesión activa única
- Backend **rechaza 2ª sesión activa** (POST `/api/registros/sesion-activa`)
- Mensaje claro: "Ya tienes una sesión activa"
- Mejora UX: botón "Terminar sesión remota" desde dispositivo actual

---

## 🔄 ESTADOS DE REGISTRO

```
┌──────────────┐
│  sesionActiva│ (cronómetro corriendo)
│   = true     │
└──────┬───────┘
       │ (terminar sesión)
       ▼
┌──────────────┐
│  pendiente   │ (esperando revisión)
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────────┐  ┌──────────────┐
│ aprobado │  │  rechazado   │
└──────────┘  └──────┬───────┘
                     │ (voluntario corrige)
                     ▼
              ┌──────────────┐
              │  pendiente   │ (reenviado)
              └──────────────┘
```

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

| # | Problema | Impacto | Solución |
|---|----------|---------|----------|
| 5 | Corrección simultánea | Datos inconsistentes | **Descartado** (no hay concurrencia real en este scale) |
| 6 | Múltiples dispositivos | 2ª sesión rechazada sin explicación | Mensaje claro + botón "Terminar remota" |
| 7 | Caché no invalidada | Datos obsoletos 30s | `invalidateCache()` en sesion-activa POST/PATCH |
| 8 | Corrección sin validar estado | Corregir aprobado | Backend valida `estado === 'rechazado'` |
| 9 | Comentario oculto | Voluntario no sabe por qué rechazado | Mostrado en Historial + Detalle |

---

## 🚀 DESPLIEGUE

### Local (desarrollo)
```bash
pnpm install
npx prisma generate
npx prisma migrate deploy  # o: npx prisma db push (dev)
pnpm run dev
```

### Producción (Vercel + Supabase)
1. Configurar variables de entorno (`.env.local` no se sube a git)
2. `npx prisma migrate deploy` en build hook
3. `pnpm build` → deploy

### Variables de entorno
```env
DATABASE_URL="postgresql://..."          # Prisma (Supabase)
DIRECT_URL="postgresql://...:6543/..."  # Prisma (pooler)
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="eyJ..."
NEXT_PUBLIC_APP_URL="https://tu-app.vercel.app"
```

---

## 📝 CONVENCIONES DE CÓDIGO

1. **Funciones puras** en `lib/utils/` → testeadas con Vitest
2. **Capa de datos** en `lib/db/` → aislada de componentes
3. **Endpoints** validan input → 400 antes de tocar BD
4. **Caché** siempre invalidada en escrituras
5. **Áreas** dinámicas (tabla `areas`) → no hardcodear en frontend
6. **CSS Modules** por componente → sin conflictos globales

---

## 🔮 ROADMAP

- [ ] Endpoint admin para crear áreas (`POST /api/areas`)
- [ ] "Terminar sesión remota" desde dispositivo actual
- [ ] Notificaciones push al aprobar/rechazar
- [ ] Exportación de reportes con filtros aplicados
- [ ] Dashboard de métricas en tiempo real (WebSocket)
