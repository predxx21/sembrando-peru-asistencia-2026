import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { listarUsuarios } from '@/lib/db/usuarios';

// Lista de voluntarios para la sección "Gestión de usuarios" del panel de
// administración (exclusivo de admin). Valida sesión y rol=admin, y devuelve
// id, nombre, apellido, email y rol paginados.
export async function GET(request) {
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

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const busqueda = searchParams.get('busqueda') || undefined;

  const { usuarios, total, error } = await listarUsuarios({ page, limit, busqueda });

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener los usuarios.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ usuarios, total, page, limit });
}
