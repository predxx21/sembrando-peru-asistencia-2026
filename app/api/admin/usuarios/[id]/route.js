import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { actualizarRolPerfil } from '@/lib/db/perfil';
import { esUUIDValido } from '@/lib/utils/validar';

// Actualiza el rol de un usuario (solo admin → admin). Valida sesión, rol=admin
// y que el target existe. PATCH { rol: "admin" | "voluntario" }.
export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile || profile.rol !== 'admin') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { rol } = body;

  if (!rol || !['admin', 'voluntario'].includes(rol)) {
    return NextResponse.json(
      { error: 'Rol inválido. Debe ser "admin" o "voluntario".' },
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

  const { profile: target, error } = await actualizarRolPerfil({ id: targetId, rol });

  if (error || !target) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el rol del usuario.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: target });
}