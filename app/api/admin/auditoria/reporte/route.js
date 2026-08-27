import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/authServer";
import { getPerfilByUserId } from "@/lib/db/perfil";
import { prisma } from "@/lib/db/client";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Obtener número de semana ISO
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Formatear fecha a DD/MM/YYYY en zona horaria de Perú
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
}

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile || profile.rol !== "admin") {
    return NextResponse.json(
      { error: "No tienes permisos de administrador." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado") || undefined;   // ← aquí el cambio
  const agruparPor = searchParams.get("agruparPor") || "semana";

  const where = {};
  if (estado) where.estado = estado;   // ← solo filtra si se envió

  if (desde || hasta) {
    where.fechaCreacion = {};
    // Offset -05:00 para Perú
    if (desde) {
      where.fechaCreacion.gte = new Date(desde + "T00:00:00-05:00");
    }
    if (hasta) {
      where.fechaCreacion.lte = new Date(hasta + "T23:59:59-05:00");
    }
  }

  // Obtener registros ordenados por fechaCreacion
  const registros = await prisma.registroAsistencia.findMany({
    where,
    include: {
      profile: {
        select: {
          nombre: true,
          apellido: true,
          area: { select: { nombre: true } },
        },
      },
    },
    orderBy: [
      { fechaCreacion: "asc" },
      { profile: { nombre: "asc" } },
      { profile: { apellido: "asc" } },
    ],
  });

  if (registros.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Agrupar por período (semana o mes) usando fechaCreacion
  function getPeriodo(fecha) {
    const d = new Date(fecha);
    if (agruparPor === "mes") {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mesNombre = d.toLocaleDateString("es-PE", { month: "long", timeZone: "America/Lima" });
      const label = `${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} ${d.getFullYear()}`;
      return { key, label };
    } else {
      const weekNumber = getWeekNumber(d);
      const year = d.getFullYear();
      const key = `${year}-W${String(weekNumber).padStart(2, "0")}`;
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = formatDate(monday);
      const sundayStr = formatDate(sunday);
      const label = `Semana ${key} (${mondayStr} - ${sundayStr})`;
      return { key, label };
    }
  }

  const grupos = {};
  for (const r of registros) {
    const { key, label } = getPeriodo(r.fechaCreacion);
    if (!grupos[key]) {
      grupos[key] = { label, registros: [] };
    }
    grupos[key].registros.push(r);
  }

  const sortedKeys = Object.keys(grupos).sort();
  const filas = [];

  for (const key of sortedKeys) {
    const grupo = grupos[key];
    const regs = grupo.registros;

    // Título del período
    filas.push({
      Voluntario: "",
      Area: "",
      FechaRegistro: "",
      FechaAprobacion: "",
      Dia: "",
      HoraInicio: "",
      HoraFin: "",
      Horas: grupo.label,
      esTitulo: true,
    });

    // Encabezados
    filas.push({
      Voluntario: "Voluntario",
      Area: "Área",
      FechaRegistro: "Fecha de Registro",
      FechaAprobacion: "Fecha de Aprobación",
      Dia: "Día",
      HoraInicio: "Hora de inicio",
      HoraFin: "Hora de fin",
      Horas: "Horas realizadas",
      esHeader: true,
    });

    // Datos (usando fechaCreacion para "FechaRegistro" y día)
    for (const r of regs) {
      const fechaRegistro = new Date(r.fechaCreacion);
      const dia = DIAS[fechaRegistro.getDay()];
      const horas = Number(r.horas) || 0;
      const fechaAprobacion = r.fechaRevision
        ? new Date(r.fechaRevision).toLocaleDateString("es-PE", { timeZone: "America/Lima" })
        : "—";
      const nombreCompleto = `${r.profile.nombre} ${r.profile.apellido || ""}`.trim();
      const area = r.profile.area?.nombre || "—";

      filas.push({
        Voluntario: nombreCompleto,
        Area: area,
        FechaRegistro: fechaRegistro.toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
        FechaAprobacion: fechaAprobacion,
        Dia: dia,
        HoraInicio: r.horaInicio || "—",
        HoraFin: r.horaFin || "—",
        Horas: horas.toFixed(2),
        esCero: horas === 0,
      });
    }

    // Subtotal por voluntario en este período
    const totalPorVoluntario = {};
    for (const r of regs) {
      const nombre = `${r.profile.nombre} ${r.profile.apellido || ""}`.trim();
      const horas = Number(r.horas) || 0;
      if (!totalPorVoluntario[nombre]) totalPorVoluntario[nombre] = 0;
      totalPorVoluntario[nombre] += horas;
    }

    const sortedVoluntarios = Object.keys(totalPorVoluntario).sort();
    for (const nombre of sortedVoluntarios) {
      filas.push({
        Voluntario: nombre,
        Area: "",
        FechaRegistro: "",
        FechaAprobacion: "",
        Dia: "",
        HoraInicio: "",
        HoraFin: "",
        Horas: totalPorVoluntario[nombre].toFixed(2),
        esSubtotal: true,
      });
    }

    filas.push({});
  }

  return NextResponse.json({ data: filas });
}