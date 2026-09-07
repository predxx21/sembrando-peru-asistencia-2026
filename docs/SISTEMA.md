# 🖥️ Guía del Sistema — Asistencia Sembrando Perú

> **Última actualización:** Septiembre 2026
> **Versión:** 1.0.0
> **Stack:** Next.js 16 · React 19 · Prisma · Supabase · PostgreSQL

---

## 📌 ¿Qué es este sistema?

Es una aplicación web interna de **Sembrando Perú** diseñada para gestionar el control de asistencia y horas de voluntariado. Permite a los voluntarios registrar su tiempo de trabajo mediante un cronómetro en tiempo real, y a los coordinadores revisar, aprobar o rechazar dichos registros. Genera reportes consolidados y auditoría completa de todas las acciones.

### Objetivos principales

1. **Registro preciso** de horas de voluntariado con cronómetro en tiempo real
2. **Flujo de aprobación** donde el coordinador valida cada registro
3. **Reportes automáticos** por voluntario, área y período
4. **Auditoría completa** de quién hizo qué y cuándo
5. **Gestión por roles** con acceso diferenciado según el nivel del usuario

---

## 🔐 Sistema de Roles

El sistema tiene **3 roles** con niveles de acceso progresivos:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COORDINADOR GENERAL                          │
│  Acceso TOTAL a todas las áreas y todos los datos               │
│  Puede: ver todo, aprobar/rechazar, reportes globales,         │
│          auditoría global                                       │
├─────────────────────────────────────────────────────────────────┤
│                        ADMIN                                    │
│  Acceso parcial: solo su área asignada                         │
│  Puede: aprobar/rechazar de su área, reportes de su área,      │
│          auditoría de su área                                   │
├─────────────────────────────────────────────────────────────────┤
│                      VOLUNTARIO                                 │
│  Acceso solo a sus propios datos                               │
│  Puede: registrar horas, ver historial propio, editar perfil    │
└─────────────────────────────────────────────────────────────────┘
```

### Diferencia clave: Admin vs Coordinador General

| Aspecto | Admin | Coordinador General |
|---------|-------|---------------------|
| Registros visibles | Solo de su área (`areaId`) | **Todas** las áreas |
| Estadísticas | De su área | Globales |
| Reportes | De su área | Globales |
| Auditoría | De su área | Global |
| Aprobar/rechazar | Solo registros de su área | Todos |

> **Nota:** El rol se asigna directamente en la base de datos. No existe interfaz para promover usuarios.

```sql
-- Promover a voluntario a admin
UPDATE profiles SET rol = 'admin' WHERE id = '<uuid-del-usuario>';

-- Promover a admin a coordinador general
UPDATE profiles SET rol = 'coordinador_general' WHERE id = '<uuid>';
```

---

## 🗺️ Mapa de Vistas por Rol

### 👤 VOLUNTARIO

```
┌──────────────────────────────────────────────────┐
│  SIDEBAR                                         │
│  ┌────────────────────────────────────────────┐  │
│  │  ▦  Panel                                 │  │
│  │  ◷  Historial                             │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  ＋ Registrar Horas                  │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  ⚙  Configuración (Editar Perfil)        │  │
│  │  ⇥  Cerrar Sesión                         │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `/principal` | **Panel** | Dashboard resumen: horas aprobadas del mes, actividades recientes, guía rápida |
| `/formulario-horas` | **Registrar Horas** | Formulario con cronómetro para registrar tiempo de voluntariado |
| `/historial` | **Historial** | Lista paginada de todos los registros del voluntario con filtros |
| `/historial/[id]` | **Detalle** | Vista detallada de un registro específico (horas, descripción, estado, motivo rechazo) |
| `/editar-perfil` | **Configuración** | Edición de nombre, apellido, área asignada y contraseña |

#### Flujo típico del voluntario:

```
1. Inicia sesión
2. Ve su Panel (/principal) → resumen de horas
3. Clic "Registrar Horas" → /formulario-horas
4. Selecciona fecha → INICIAR cronómetro
5. Realiza su actividad de voluntariado
6. TERMINAR cronómetro → horas calculadas automáticamente
7. Escribe descripción → GUARDAR
8. Estado: PENDIENTE (esperando revisión del coordinador)
9. Revisa Historial (/historial) → ve el estado de sus registros
10. Si rechazado → clic en registro → "Corregir" → editar → reenviar
```

---

### 🛠️ ADMIN (Coordinador de Área)

```
┌──────────────────────────────────────────────────┐
│  SIDEBAR                                         │
│  ┌────────────────────────────────────────────┐  │
│  │  ◉  Administración                        │  │
│  │  ◱  Auditoría                             │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  ＋ Registrar Horas                  │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  ⚙  Configuración (Editar Perfil)        │  │
│  │  ⇥  Cerrar Sesión                         │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `/administracion` | **Panel Admin** | Dashboard con estadísticas del área, tendencias, registros pendientes para aprobar/rechazar |
| `/administracion/auditoria` | **Auditoría** | Historial completo de revisiones con filtros avanzados, KPIs, exportación |
| `/editar-perfil` | **Configuración** | Edición de perfil propio |

#### Funcionalidades del Panel Admin (`/administracion`):

**1. Tarjetas de resumen (KPIs):**
- Pendientes de revisión
- Horas aprobadas este mes
- Voluntarios activos en el área
- Tendencia semanal (gráfico de barras)

**2. Tabla de registros pendientes:**

| Columna | Contenido |
|---------|-----------|
| Voluntario | Nombre + avatar |
| Fecha | Día de la actividad |
| Inicio / Fin | Horas del cronómetro |
| Horas | Duración calculada |
| Descripción | Qué hizo el voluntario |
| Acciones | ✅ Aprobar / ❌ Rechazar |

- **Filtros:** búsqueda por nombre, rango de fechas, área (solo coordinador general)
- **Paginación:** 6 registros por página
- **Aprobar:** clic ✅ → registro pasa a estado `aprobado`
- **Rechazar:** clic ❌ → se abre `prompt()` para escribir motivo → registro pasa a `rechazado`

**3. Funcionalidades del admin como voluntario:**
- El admin **también puede** registrar horas con cronómetro (mismo formulario que voluntarios)
- También ve su propio historial y puede editar su perfil

#### Funcionalidades de Auditoría (`/administracion/auditoria`):

**1. Tarjetas KPI:**
- Total de registros revisados
- Aprobados / Rechazados / Pendientes
- Horas aprobadas totales

**2. Filtros avanzados:**
- Búsqueda por nombre de voluntario
- Filtrar por revisor (quién aprobó/rechazó)
- Filtrar por estado (aprobado / rechazado / pendiente)
- Rango de fechas con atajos ("Última semana", "Último mes", "Último trimestre")

**3. Tabla de auditoría:**
- Registro completo de todas las acciones de revisión
- Muestra: voluntario, fecha del registro, horas, revisor, fecha de revisión, comentario

**4. Exportación:**
- Botón "Exportar" → modal con opciones:
  - Formato: CSV o Excel (.xlsx)
  - Agrupar por: semana / mes / voluntario / área
  - Filtrar por estado y rango de fechas

---

### 🌐 COORDINADOR GENERAL

```
┌──────────────────────────────────────────────────┐
│  SIDEBAR                                         │
│  ┌────────────────────────────────────────────┐  │
│  │  ◉  Administración                        │  │
│  │  ◱  Auditoría                             │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  ＋ Registrar Horas                  │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  ⚙  Configuración (Editar Perfil)        │  │
│  │  ⇥  Cerrar Sesión                         │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

Misma interfaz que Admin, pero con **acceso global a todas las áreas**:

| Diferencia | Admin | Coordinador General |
|------------|-------|---------------------|
| Registros en `/administracion` | Solo su área | **Todas** las áreas |
| Filtro de áreas | Oculto | **Visible** (puede filtrar por cualquier área) |
| Estadísticas KPI | Del área asignada | **Globales** (todas las áreas) |
| Auditoría | Solo su área | **Todas** las áreas |
| Horas aprobadas | Del área | **Globales** |

> **Nota:** La ruta `/reportes` existe técnicamente pero redirige automáticamente a `/administracion`. Los reportes consolidados se integran en el Panel Admin.

---

## ⏱️ Flujo del Cronómetro (Detalle)

El cronómetro es la funcionalidad central del sistema. Aquí se detalla su funcionamiento:

```
FRONTEND (Navegador)                    BACKEND (Servidor)
─────────────────────                   ──────────────────

1. Usuario abre /formulario-horas
   │
   ├─ GET /api/registros/sesion-activa ──→ ¿Hay sesión activa?
   │                                        ├─ SÍ → Mostrar cronómetro corriendo
   │                                        └─ NO → Mostrar formulario limpio
   │
2. Usuario selecciona fecha
   │
3. Clic "INICIAR"
   │
   ├─ POST /api/registros/sesion-activa ─→ Crear registro:
   │                                        - sesionActiva = true
   │                                        - horaInicioReal = timestamp exacto
   │                                        - fecha = seleccionada
   │                                        - Rechaza si ya hay sesión activa
   │
   ├─ Cronómetro inicia en UI (setInterval)
   │  (corre incluso si la pestaña pierde foco)
   │
4. Usuario hace su actividad...
   │
5. Clic "TERMINAR"
   │
   ├─ PATCH /api/registros/sesion-activa ─→ Cerrar sesión:
   │                                        - sesionActiva = false
   │                                        - Calcula horas = fin - inicio
   │                                        - estado = "pendiente"
   │
6. Usuario escribe descripción
   │
7. Clic "GUARDAR"
   │
   ├─ PATCH /api/registros/[id] ─────────→ Actualizar descripción
   │
8. Registro en estado PENDIENTE
   (esperando revisión del coordinador)
```

### Reglas del cronómetro:

- **Sesión única:** No se puede tener 2 cronómetros corriendo a la vez
- **Sesión persistente:** Si cierras la pestaña, la sesión queda activa en el servidor. Al volver, el cronómetro retoma
- **Fechas:** Solo pasado y presente. No se permiten fechas futuras
- **Horas calculadas automáticamente:** El sistema calcula `horaFin - horaInicio` al terminar
- **Descripción:** Se puede agregar después de guardar (campo editable)

---

## 📊 Estados de un Registro

```
    ┌─────────────────────┐
    │   sesionActiva      │  ← Cronómetro corriendo
    │   (en progreso)     │
    └──────────┬──────────┘
               │ TERMINAR
               ▼
    ┌─────────────────────┐
    │     pendiente       │  ← Esperando revisión
    └──────────┬──────────┘
               │
          ┌────┴────┐
          │         │
          ▼         ▼
  ┌──────────┐  ┌──────────────┐
  │ aprobado │  │  rechazado   │
  │  ✅      │  │     ❌       │
  └──────────┘  └──────┬───────┘
                       │ "Corregir"
                       ▼
              ┌──────────────┐
              │   pendiente  │  ← Reenviado
              └──────────────┘
```

| Estado | Significado | ¿Quién lo cambia? |
|--------|-------------|---------------------|
| `sesionActiva = true` | Cronómetro corriendo | Voluntario (INICIAR/TERMINAR) |
| `pendiente` | Esperando revisión del coordinador | Sistema (al terminar cronómetro o guardar) |
| `aprobado` | Horas validadas, cuentan en reportes | Admin / Coordinador General |
| `rechazado` | Coordinador pidió corrección | Admin / Coordinador General |

---

## 🖥️ Todas las Pantallas del Sistema

### Pantallas de autenticación (fuera del portal)

| Ruta | Pantalla | Descripción |
|------|----------|-------------|
| `/` | **Login** | Inicio de sesión con email + contraseña. Muestra imagen de fondo de Sembrando Perú |
| `/registro` | **Registro** | Crear cuenta nueva. Requiere email `@sembrandoperu.org`, nombre, apellido, área y contraseña |
| `/olvide-contrasena` | **Recuperar contraseña** | Ingresar email para recibir enlace de restablecimiento |
| `/restablecer-contrasena` | **Restablecer contraseña** | Definir nueva contraseña (accede desde enlace del email) |

### Pantallas del portal (requieren autenticación)

| Ruta | Pantalla | Roles con acceso | Componente principal |
|------|----------|------------------|----------------------|
| `/principal` | Panel del Voluntario | `voluntario` | `PanelVoluntario.jsx` |
| `/formulario-horas` | Registrar Horas | Todos | `RegistrarHoras.jsx` + `Cronometro.jsx` |
| `/historial` | Historial | `voluntario` | `ListadoHistorial.jsx` |
| `/historial/[id]` | Detalle de Registro | `voluntario` | `VerDetalle.jsx` |
| `/registro-editar/[id]` | Corregir Registro | `voluntario` | `CorregirActividad.jsx` |
| `/editar-perfil` | Editar Perfil | Todos | `EditarPerfil.jsx` |
| `/administracion` | Panel Admin | `admin`, `coordinador_general` | `AdminDashboard.jsx` |
| `/administracion/auditoria` | Auditoría | `admin`, `coordinador_general` | `HistorialAuditoria.jsx` |
| `/reportes` | Reportes | — | Redirige a `/administracion` |

### API Routes (Backend)

| Método | Ruta | Descripción | Auth requerido |
|--------|------|-------------|----------------|
| GET | `/api/auth/me` | Usuario autenticado actual | Sí |
| GET/POST/PATCH | `/api/auth/perfil` | Leer/crear/actualizar perfil | Sí |
| GET/POST | `/api/registros` | Listar/crear registros de asistencia | Sí |
| GET/PATCH | `/api/registros/[id]` | Detalle/aprobar/rechazar registro | Sí |
| PATCH | `/api/registros/[id]/corregir` | Corregir registro rechazado | Sí (propietario) |
| GET/POST/PATCH | `/api/registros/sesion-activa` | Gestionar cronómetro en tiempo real | Sí |
| GET | `/api/admin/estadisticas` | Estadísticas del dashboard admin | `admin`/`coordinador_general` |
| GET | `/api/admin/reportes` | Reportes consolidados | `admin`/`coordinador_general` |
| GET | `/api/admin/auditoria` | Historial de revisiones | `admin`/`coordinador_general` |
| GET | `/api/admin/auditoria/reporte` | Exportar auditoría (JSON/XLSX) | `admin`/`coordinador_general` |
| GET | `/api/areas` | Lista de áreas (autenticado) | Sí |
| GET | `/api/areas/publico` | Catálogo público de áreas | No |
| GET | `/api/voluntario/estadisticas` | Estadísticas personales del voluntario | Sí |

---

## 📐 Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                              │
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │   Componentes React  │  │   Supabase Client (anon)     │   │
│  │   (UI + Estado local)│  │   (solo auth: login/logout)  │   │
│  └──────────┬──────────┘  └──────────────┬───────────────┘   │
│             │                             │                    │
│             │ fetchConToken()             │                    │
│             ▼                             │                    │
│  ┌──────────────────────────────────────────┐                │
│  │         fetch('api/...') + Bearer         │                │
│  └──────────────────┬───────────────────────┘                │
└─────────────────────┼────────────────────────────────────────┘
                      │ Authorization: Bearer <JWT>
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                     SERVIDOR (Next.js)                        │
│                                                               │
│  ┌──────────────────────┐  ┌─────────────────────────────┐   │
│  │   Route Handlers      │  │   Supabase Admin (service)  │   │
│  │   (app/api/*)         │  │   (valida JWT + admin ops)  │   │
│  └──────────┬───────────┘  └─────────────────────────────┘   │
│             │                                                 │
│             │ getUserFromRequest() → JWT validation           │
│             │ getPerfilByUserId() → role + area check         │
│             ▼                                                 │
│  ┌──────────────────────┐  ┌─────────────────────────────┐   │
│  │   Capa DB (lib/db/*)  │  │   Caché en memoria          │   │
│  │   Prisma ORM          │  │   (TTL 30-60s, globalThis)  │   │
│  └──────────┬───────────┘  └─────────────────────────────┘   │
└─────────────┼────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│              BASE DE DATOS (Supabase PostgreSQL)              │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐   │
│  │ profiles  │  │  areas   │  │  registroasistencia      │   │
│  └──────────┘  └──────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Capas del servidor:

| Capa | Archivos | Responsabilidad |
|------|----------|-----------------|
| **Route Handlers** | `app/api/**/*.js` | Validar auth, input, devolver JSON |
| **Auth Server** | `lib/supabase/authServer.js` | Verificar JWT, cachear usuario (60s) |
| **DB Layer** | `lib/db/*.js` | Queries Prisma, validación de negocio |
| **Caché** | `lib/cache.js` | TTL en memoria, invalidación por prefijos |
| **Utils** | `lib/utils/*.js` | Funciones puras: fechas, horas, validación, exportación |

### Separación server/client:

- **Prisma** solo se ejecuta en el servidor (nunca en el navegador)
- **Service Role Key** solo en `lib/supabase/server.js` (nunca `NEXT_PUBLIC_`)
- **Supabase Client (anon)** en `lib/supabase/client.js` (seguro para navegador)
- Los componentes React **nunca** llaman a Prisma directamente; siempre usan `fetch()` a API routes

---

## 🔄 Flujo Completo: De voluntario a reporte

```
╔══════════════════════════════════════════════════════════════╗
║  PASO 1: VOLUNTARIO REGISTRA HORAS                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Voluntario → /formulario-horas                              ║
║    ├─ Selecciona fecha                                       ║
║    ├─ INICIAR cronómetro                                      ║
║    ├─ (actividad de voluntariado)                             ║
║    ├─ TERMINAR cronómetro                                     ║
║    ├─ Escribe: "Taller de reforestación en El Agostino"      ║
║    └─ GUARDAR                                                 ║
║                                                              ║
║  Resultado: Registro con estado = PENDIENTE                  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  PASO 2: COORDINADOR REVISA                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Admin → /administracion                                     ║
║    ├─ Ve tarjeta "Pendientes: 5"                             ║
║    ├─ Ve tabla con registros pendientes de su área           ║
║    ├─ Revisa descripción del voluntario                      ║
║    └─ Acción:                                                ║
║       ├─ ✅ APROBAR → estado = APROBADO                     ║
║       └─ ❌ RECHAZAR → escribe motivo → estado = RECHAZADO  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  PASO 3: SI FUE RECHAZADO — VOLUNTARIO CORRIGE              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Voluntario → /historial → clic en registro rechazado        ║
║    ├─ Ve motivo: "No se especificó la ubicación"             ║
║    ├─ Clic "Corregir"                                        ║
║    ├─ Edita descripción: "Taller de reforestación,           ║
║    │   Parque Ecológico El Agostino, Lima"                   ║
║    └─ GUARDAR → estado = PENDIENTE (reenviado)               ║
║                                                              ║
║  (vuelve al Paso 2)                                          ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  PASO 4: EL REGISTRO APARECE EN REPORTES                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Admin/Coord. General → /administracion                      ║
║    ├─ Estadísticas muestran horas aprobadas acumuladas       ║
║    ├─ Auditoría muestra la cadena completa:                  ║
║    │   Juan registró → María aprobó → fecha/hora             ║
║    └─ Exportar → Excel con todos los registros filtrados     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🗂️ Gestión de Áreas

Las áreas son **dinámicas** y se gestionan directamente en la base de datos:

```sql
-- Crear nueva área
INSERT INTO areas (nombre, descripcion, orden)
VALUES ('Medio Ambiente', 'Reforestación y cuidado del entorno', 3);

-- Desactivar área (soft delete)
UPDATE areas SET activa = false WHERE nombre = 'Área Antigua';
```

### Flujo de áreas:

| Evento | Fuente | API |
|--------|--------|-----|
| Registro de usuario | Catálogo público | `GET /api/areas/publico` |
| Asignación de área | Perfil del usuario | `profile.areaId` en tabla `profiles` |
| Filtros admin | Áreas del usuario | `GET /api/areas` (autenticado) |
| Crear/editar áreas | SQL directo | `INSERT/UPDATE` en tabla `areas` |

> **Próximamente:** Endpoint `POST /api/areas` para crear áreas desde la interfaz.

---

## 📤 Exportación de Datos

### Desde Reportes/Panel Admin:

| Formato | Descripción | Librería |
|---------|-------------|----------|
| **CSV** | valores separados por comas | Generación manual en cliente |
| **Excel (.xlsx)** | Hoja de cálculo completa | ExcelJS (server-side) |

### Desde Auditoría:

| Formato | Opciones |
|---------|----------|
| **JSON** | Datos crudos para integración |
| **Excel (.xlsx)** | Con agrupación por semana/mes/voluntario/área |

---

## 🛡️ Seguridad

### Autenticación

- **Proveedor:** Supabase Auth (basado en GoTrue)
- **Tokens:** JWT emitidos al login, enviados como `Authorization: Bearer`
- **Validación:** En cada request al servidor, `getUserFromRequest()` verifica el JWT contra Supabase
- **Caché de tokens:** 60 segundos por hash SHA-256 del token

### Autorización (por ruta)

| Ruta API | Voluntario | Admin | Coordinador General |
|----------|:----------:|:-----:|:-------------------:|
| `GET /api/auth/me` | ✅ | ✅ | ✅ |
| `GET/PATCH /api/auth/perfil` | ✅ (propio) | ✅ (propio) | ✅ (propio) |
| `GET /api/registros` | ✅ (propios) | ✅ (su área) | ✅ (todos) |
| `POST /api/registros` | ✅ | ✅ | ✅ |
| `GET /api/registros/[id]` | ✅ (propio) | ✅ (su área) | ✅ (todos) |
| `PATCH /api/registros/[id]` | ❌ | ✅ (su área) | ✅ (todos) |
| `PATCH /api/registros/[id]/corregir` | ✅ (propio, rechazados) | ✅ | ✅ |
| `GET/POST/PATCH /api/registros/sesion-activa` | ✅ (propia) | ✅ (propia) | ✅ (propia) |
| `GET /api/admin/estadisticas` | ❌ | ✅ (su área) | ✅ (global) |
| `GET /api/admin/reportes` | ❌ | ✅ (su área) | ✅ (global) |
| `GET /api/admin/auditoria` | ❌ | ✅ (su área) | ✅ (global) |
| `GET /api/admin/auditoria/reporte` | ❌ | ✅ (su área) | ✅ (global) |
| `GET /api/areas` | ✅ | ✅ | ✅ |
| `GET /api/areas/publico` | ✅ (sin auth) | ✅ (sin auth) | ✅ (sin auth) |
| `GET /api/voluntario/estadisticas` | ✅ (propias) | ✅ (propias) | ✅ (propias) |

### Protecciones implementadas

- **IDOR:** `/api/auth/perfil` ignora `?id=` y siempre usa el `user.id` del token
- **Auto-auditoría:** Un admin no puede aprobar/rechazar sus propios registros
- **Sesión única:** Solo un cronómetro activo por usuario
- **Headers de seguridad:** CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- **Dominio restringido:** Solo emails `@sembrandoperu.org` pueden registrarse
- **SQL parametrizado:** Todas las queries usan Prisma ORM o tagged templates

---

## 📦 Base de Datos

### Modelo de datos

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│    areas     │       │      profiles        │       │ registroasistencia│
├──────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (UUID PK) │◄──────│ areaId (UUID FK)     │◄──────│ profileId (TEXT)  │
│ nombre       │       │ id (UUID PK)         │       │ id (INT PK)      │
│ descripcion  │       │ nombre               │       │ fecha            │
│ activa       │       │ apellido             │       │ horaInicio       │
│ orden        │       │ rol (ENUM)           │       │ horaFin          │
│ fechaCreacion│       │ avatarUrl            │       │ horas            │
└──────────────┘       └──────────────────────┘       │ descripcion      │
                                                       │ estado (ENUM)    │
                                                       │ sesionActiva     │
                                                       │ horaInicioReal   │
                                                       │ comentarioRevision│
                                                       │ revisorId (FK)   │
                                                       │ fechaRevision    │
                                                       └──────────────────┘
```

### Enums

| Enum | Valores |
|------|---------|
| `Rol` | `voluntario`, `admin`, `coordinador_general` |
| `EstadoRegistro` | `pendiente`, `aprobado`, `rechazado` |

---

## 🚀 Despliegue

### Variables de entorno requeridas

```env
# Base de datos (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."          # Pooler de transacciones
DIRECT_URL="postgresql://...:6543/..."   # Pooler de sesiones

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# App
NEXT_PUBLIC_APP_URL="https://tu-dominio.vercel.app"
```

### Comandos

```bash
# Desarrollo local
pnpm install
npx prisma generate
npx prisma db push        # Sync schema (dev)
pnpm run dev              # http://localhost:3000

# Producción (Vercel)
npx prisma migrate deploy  # Aplicar migraciones
pnpm build                 # Build de producción
```

---

## 📚 Documentación relacionada

- [ARQUITECTURA.md](./ARQUITECTURA.md) — Detalles técnicos de la arquitectura, optimizaciones y roadmap
- [MANUAL_USUARIO.md](./MANUAL_USUARIO.md) — Guía de uso para voluntarios y coordinadores

---

*Documento generado como parte de la documentación del sistema Asistencia Sembrando Perú.*
