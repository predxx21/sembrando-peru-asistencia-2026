import { NextResponse } from 'next/server';
import { getPerfilByUserId, upsertPerfil } from '@/lib/db/perfil';

// Crea (o confirma) el perfil de un usuario en Postgres vía Prisma.
// Se llama desde el cliente justo después de un signUp/login exitoso
// contra Supabase Auth, porque Prisma no puede ejecutarse en el navegador.
export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.id) {
    return NextResponse.json({ error: 'Falta el id del usuario.' }, { status: 400 });
  }

  const { profile, error } = await upsertPerfil({
    id: body.id,
    nombre: body.nombre,
    apellido: body.apellido,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// Obtiene el perfil (nombre, apellido, rol) de un usuario ya autenticado.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el id del usuario.' }, { status: 400 });
  }

  const { profile, error } = await getPerfilByUserId(id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo obtener el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
