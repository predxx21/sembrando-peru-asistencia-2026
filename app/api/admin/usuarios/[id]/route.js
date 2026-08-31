import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { actualizarRolPerfil } from '@/lib/db/perfil';
import { prisma } from '@/lib/db/client';
import { esUUIDValido } from '@/lib/utils/validar';

export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  // Permitir admin y coordinador_general
  if (perfilError || !profile || (profile.rol !== 'admin' && profile.rol !== 'coordinador_general')) {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { rol } = body;

  // Whitelist actualizada: incluir coordinador_general
  if (!rol || !['admin', 'voluntario', 'coordinador_general'].includes(rol)) {
    return NextResponse.json(
      { error: 'Rol inválido. Debe ser "admin", "voluntario" o "coordinador_general".' },
      { status: 400 }
    );
  }

  const targetId = params.id;

  if (!esUUIDValido(targetId)) {
    return NextResponse.json(
      { error: 'Id de usuario inválido.' },
      { status: 400 }
    );
  }

  if (targetId === user.id) {
    return NextResponse.json(
      { error: 'No puedes cambiar tu propio rol.' },
      { status: 400 }
    );
  }

  // Obtener el perfil objetivo para validar área
  const targetProfile = await prisma.profile.findUnique({
    where: { id: targetId },
    select: { areaId: true, rol: true },
  });

  if (!targetProfile) {
    return NextResponse.json(
      { error: 'Usuario no encontrado.' },
      { status: 404 }
    );
  }

  // Si el admin es de área (no coordinador general), validar que el usuario objetivo pertenezca a su área
  if (profile.rol === 'admin') {
    if (targetProfile.areaId !== profile.areaId) {
      return NextResponse.json(
        { error: 'No puedes modificar usuarios de otras áreas.' },
        { status: 403 }
      );
    }
  }

  // Si el coordinador_general intenta asignar rol admin, asegurar que tiene área asignada (opcional)
  if (rol === 'admin' && !targetProfile.areaId) {
    return NextResponse.json(
      { error: 'El usuario debe tener un área asignada para ser administrador.' },
      { status: 400 }
    );
  }

  const { profile: updated, error } = await actualizarRolPerfil({ id: targetId, rol });

  if (error || !updated) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el rol del usuario.' },
      { status: 500 }
    );
  }

  // Invalidar caché de usuarios
  // (asumiendo que tienes una función para invalidar por prefijo)
  // invalidateCacheByPrefix('admin:usuarios:');

  return NextResponse.json({ profile: updated });
}