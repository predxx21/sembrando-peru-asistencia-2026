# 📖 Manual de Usuario — Sistema de Asistencia Sembrando Perú
 
> **Última actualización:** Septiembre 2026  
> **Para:** Voluntarios y Coordinadores de Sembrando Perú

---

## 🎯 ¿Qué es este sistema?

Es una aplicación web para **registrar tus horas de voluntariado** usando un cronómetro, que luego son **revisadas y aprobadas** por tu coordinador de área. Genera reportes automáticos para la organización.

**Acceso:** `https://tu-dominio.vercel.app` (o `http://localhost:3000` en desarrollo)

---

## 👥 ¿Quién usa qué?

| Rol | Qué ve | Qué hace |
|-----|--------|----------|
| **Voluntario** | Panel, Historial, Formulario Horas, Editar Perfil | Registra horas con cronómetro, ve su historial, corrige rechazados |
| **Coordinador (Admin)** | Todo lo anterior + Administración, Reportes, Auditoría | Aprueba/rechaza registros de su área, ve reportes consolidados |
| **Coordinador General** | Todo + todas las áreas | Acceso global a todas las áreas |

> **Nota:** Al registrarte entras como **Voluntario**. Para ser Admin, pide a tu coordinador que te promueva en la base de datos.

---

## 🚀 PRIMEROS PASOS

### 1. Crear tu cuenta
1. Entra a la web → clic en **"Regístrate"**
2. Usa tu email **@sembrandoperu.org**
3. Completa: Nombre, Apellido, Área (obligatoria), Contraseña
4. ¡Listo! Inicias sesión automáticamente

### 2. Iniciar sesión
- Email + contraseña
- Check "Recordar sesión" (opcional)
- ¿Olvidaste la contraseña? → "Recuperar contraseña" → te llega email

---

## ⏱️ PARA VOLUNTARIOS: REGISTRAR HORAS (CRONÓMETRO)

### Pantalla: **Formulario de Horas** (`/formulario-horas`)

```
┌─────────────────────────────────────┐
│  📅 Fecha:     [ 2026-09-04      ]  │
│  ⏰ Inicio:    [ 09:00 ]  (cronómetro)│
│  ⏰ Fin:       [ 13:00 ]  (cronómetro)│
│  📝 Descripción: [________________] │
│  [INICIAR]  [TERMINAR]  [GUARDAR]   │
└─────────────────────────────────────┘
```

### Flujo con cronómetro (recomendado):

1. **Fecha**: Selecciona el día de la actividad (hoy o pasado, **no futuro**)
2. **INICIAR**: Al empezar tu voluntariado → se guarda hora exacta de inicio
3. **Haces tu actividad** (la pestaña puede estar abierta en segundo plano)
4. **TERMINAR**: Al finalizar → se calculan las horas automáticamente
5. **Descripción**: Qué hiciste (ej: "Taller de lectura con niños 5° primaria")
6. **GUARDAR** → Estado: **Pendiente** (esperando revisión de tu coordinador)

### Flujo manual (sin cronómetro):
- Escribe **Hora inicio** y **Hora fin** a mano (formato HH:MM, 24h)
- Completa descripción → **GUARDAR**

### ⚠️ Reglas importantes:
- **Una sola sesión activa a la vez** — si olvidaste terminar en otro dispositivo, el sistema te avisará
- **Área obligatoria** — si no tienes área asignada, ve a *Editar Perfil* y selecciónala
- **No fechas futuras** — el sistema las rechaza
- **Descripción clara** — ayuda a tu coordinador a validar rápido

---

## 📋 PARA VOLUNTARIOS: VER TU HISTORIAL

### Pantalla: **Historial** (`/historial`)

| Fecha | Inicio | Fin | Horas | Descripción | Estado |
|-------|--------|-----|-------|-------------|--------|
| 04/09 | 09:00 | 13:00 | 4.0 | Taller lectura | ✅ Aprobado |
| 02/09 | 14:00 | 17:00 | 3.0 | Limpieza parque | ⏳ Pendiente |
| 30/08 | 10:00 | 12:00 | 2.0 | Reparto alimentos | ❌ Rechazado |

### Estados:
- 🟡 **Pendiente** — Tu coordinador no lo ha revisado aún
- 🟢 **Aprobado** — Horas validadas, cuentan para tu reporte
- 🔴 **Rechazado** — Ver motivo clicando en la fila → **Corregir y reenviar**

### Corregir un registro rechazado:
1. Clic en el registro → verás el **motivo del rechazo**
2. Botón **"Corregir"** → edita fecha y/o descripción
3. **Guardar** → vuelve a estado **Pendiente** para nueva revisión

> **Importante:** Las horas (inicio/fin) **no se pueden cambiar** al corregir — salen del cronómetro original.

---

## 👤 PARA VOLUNTARIOS: EDITAR PERFIL

### Pantalla: **Editar Perfil** (`/editar-perfil`)

- **Nombre / Apellido** — Tu nombre visible
- **Área** — **Obligatoria** (selector con tus áreas disponibles)
- **Contraseña** — Opcional, solo si quieres cambiarla
- **Guardar cambios**

---

## 📊 PANEL DEL VOLUNTARIO (`/principal`)

Resumen rápido:
- **Horas aprobadas este mes** (meta: 30h/mes)
- **Actividades de la semana**
- **Próximos pasos** (si tienes pendientes)

---

## 🛠️ PARA COORDINADORES (ADMIN)

### Acceso: **Administración** (`/administracion`)

#### 1. **Pendientes de revisión** — Lista de registros de TU área esperando aprobación

| Voluntario | Fecha | Horas | Descripción | Acciones |
|------------|-------|-------|-------------|----------|
| Juan Pérez | 04/09 | 4.0 | Taller lectura | [✅ Aprobar] [❌ Rechazar] |
| María López | 02/09 | 3.0 | Limpieza parque | [✅ Aprobar] [❌ Rechazar] |

**Aprobar:** Clic ✅ → horas validadas inmediatamente  
**Rechazar:** Clic ❌ → **escribe motivo obligatorio** → voluntario lo ve y corrige

#### 2. **Estadísticas del área** (tarjetas arriba)
- Pendientes de revisar
- Horas aprobadas este mes
- Voluntarios activos
- Tendencia semanal (gráfico)

#### 3. **Auditoría** (`/administracion/auditoria`)
Historial completo de **todas las revisiones** (quién aprobó/rechazó, cuándo, comentario).
- Filtros: por revisor, por estado, por fecha
- Exportar a Excel/CSV

---

## 📈 PARA COORDINADORES: REPORTES (`/reportes`)

Vista consolidada de **todo el voluntariado** (Admin = su área, Coordinador General = todas):

### Resumen (tarjetas)
- Total horas aprobadas
- Voluntarios activos
- Registros pendientes
- Promedio horas/voluntario

### Tabla detalle por voluntario
| Voluntario | Área | Horas Aprobadas | Registros | Última actividad |
|------------|------|-----------------|-----------|------------------|
| Juan Pérez | Educación | 45.5 | 12 | 04/09/2026 |
| María López | Salud | 32.0 | 8 | 02/09/2026 |

### Gráfico: **Horas semanales** — Tendencia últimos 8 semanas

### Exportar
- Botón **"Exportar"** → elige **CSV** o **Excel (.xlsx)**
- Se descarga con los filtros aplicados (área, fechas, estado)

---

## ❓ PREGUNTAS FRECUENTES (FAQ)

### 🔐 Acceso y cuenta

**P: No me llega el email de recuperación de contraseña**  
R: Revisa **Spam/Correo no deseado**. Si no llega en 5 min, contacta a tu coordinador.

**P: Me dice "No tienes área asignada" al registrar horas**  
R: Ve a **Editar Perfil** → selecciona tu área → Guardar. Si no aparece tu área, pídele a tu coordinador que la cree en la BD.

**P: ¿Cómo me hago Admin?**  
R: No hay botón en la app. Tu coordinador general debe ejecutar en Supabase SQL Editor:
```sql
UPDATE profiles SET rol = 'admin' WHERE email = 'tu@email.org';
```

---

### ⏱️ Cronómetro y registro

**P: Cerré la pestaña sin dar a TERMINAR, ¿perdí mis horas?**  
R: **No.** La sesión queda "activa" en el servidor. Al volver a *Formulario de Horas*, verás el cronómetro corriendo → dale a TERMINAR.

**P: "Ya tienes una sesión activa" — ¿qué hago?**  
R: Tienes un cronómetro abierto en otro dispositivo/navegador. Ve ahí y dale a TERMINAR. (Próximamente: botón "Terminar remota").

**P: ¿Puedo registrar horas de ayer/semana pasada?**  
R: **Sí.** Cambia la fecha en el formulario. **No** se permiten fechas futuras.

**P: ¿Las horas se guardan si pierdo internet?**  
R: El cronómetro corre en tu navegador (local). Al dar TERMINAR o GUARDAR, **necesitas internet** para enviar al servidor.

---

### 🛠️ Coordinadores

**P: Veo registros de voluntarios que no son de mi área**  
R: Solo los **Coordinador General** ven todas las áreas. Los Admin normales solo ven su `areaId`.

**P: ¿Puedo crear nuevas áreas desde la app?**  
R: **No aún** (en roadmap). Por ahora: INSERT directo en tabla `areas` vía Supabase SQL Editor:
```sql
INSERT INTO areas (nombre, descripcion, orden) VALUES ('Nueva Área', 'Descripción', 10);
```

**P: ¿Cómo exporto solo los aprobados de este mes?**  
R: En *Reportes* → aplica filtros (estado=Aprobado, fecha=mes actual) → Exportar.

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

| Problema | Solución |
|----------|----------|
| "Error 401 / No autenticado" | Cierra sesión y vuelve a entrar (token expirado) |
| "Error 403 / Sin permisos" | Verifica tu rol en Editar Perfil; si eres voluntario, no ves Admin/Reportes |
| Cronómetro no inicia | Verifica que tienes área asignada en Editar Perfil |
| Horas se ven mal (ej. 3.9999) | Es redondeo visual; en BD se guarda exacto. Reportes usan 2 decimales |
| No veo mi área en el selector | Pide a tu coordinador que la cree en BD (tabla `areas`) |

---

## 📞 CONTACTO Y SOPORTE

| Tema | Contacto |
|------|----------|
| Problemas técnicos / bugs | Equipo de desarrollo (GitHub Issues) |
| Dudas de voluntariado / horas | Tu coordinador de área |
| Acceso / roles / áreas | Coordinador General |
| Caída del sistema / urgente | [Slack/Email de guardia] |

---

## 📝 GLOSARIO

| Término | Significado |
|---------|-------------|
| **Cronómetro** | Medidor de tiempo real (inicio/fin automático) |
| **Sesión activa** | Cronómetro corriendo (estado `sesionActiva=true`) |
| **Pendiente** | Registro esperando revisión del coordinador |
| **Aprobado** | Horas validadas, cuentan en reportes |
| **Rechazado** | Coordinador pidió corrección; voluntario debe editar y reenviar |
| **Área** | Grupo de voluntariado (Educación, Salud, Medio Ambiente, etc.) |
| **Coordinador General** | Rol con acceso a **todas** las áreas |
| **Exportar** | Descargar reporte en CSV o Excel |

---

## 🔄 FLUJO COMPLETO (RESUMEN)

```
VOLUNTARIO                          COORDINADOR
─────────────────────────────────────────────────────────
1. Inicia cronómetro
2. Hace actividad
3. Termina cronómetro
4. Escribe descripción
5. GUARDA → [PENDIENTE] ──────────► 6. Ve en Administración
                                       7. Revisa descripción
                                       8. ✅ APRUEBA  → [APROBADO] → Cuenta en reportes
                                          ❌ RECHAZA (con motivo) → [RECHAZADO]
                                                                           │
9. Ve RECHAZADO en Historial ◄──────┘
10. Clic "Corregir" → edita fecha/descripción
11. GUARDA → [PENDIENTE] ──────────► (vuelve al paso 6)
```

---

---

*¿Sugerencias para mejorar este manual? Abre un issue en el repo o avisa al equipo de desarrollo.*