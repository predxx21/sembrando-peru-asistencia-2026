import { prisma } from './client';
import { getCached, setCached, removeCached } from '@/lib/cache';

// El perfil (incluido el rol) se lee en TODOS los endpoints. Cachearlo un
// corto tiempo (30 s) evita un round-trip a la BD por cada request de la
// misma pantalla. TTL corto a propósito: el `rol` es sensible a seguridad,
// así un cambio de rol no demora más de 30 s en verificarse. Al editar el
// perfil se invalida su entrada (removeCached) para que el cambio se vea ya.
const PERFIL_CACHE_TTL_MS = 30 * 1000;

export async function getPerfilByUserId(userId) {
  try {
    const cacheKey = `perfil:${userId}`;
    const cacheado = getCached(cacheKey);
    if (cacheado) {
      return { profile: cacheado, error: null };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, apellido: true, rol: true },
    });

    if (profile) setCached(cacheKey, profile, PERFIL_CACHE_TTL_MS);
    return { profile, error: null };
  } catch (error) {
    console.error('Error en getPerfilByUserId:', error);
    return { profile: null, error };
  }
}

// Crea el perfil en Postgres (vía Prisma) inmediatamente después de un
// supabase.auth.signUp() exitoso. El id DEBE ser el mismo id (uuid) que
// Supabase Auth generó para el usuario, para que quede enlazado 1:1.
export async function crearPerfil({ id, nombre, apellido }) {
  try {
    const profile = await prisma.profile.create({
      data: { id, nombre, apellido },
    });
    return { profile, error: null };
  } catch (error) {
    console.error('Error en crearPerfil:', error);
    return { profile: null, error };
  }
}

// Igual que crearPerfil, pero no falla si el perfil ya existe (idempotente).
// Se usa como red de seguridad en el login: si por algún motivo el registro
// no llegó a crear el perfil (ej. el usuario cerró la pestaña a mitad de
// camino), lo crea en el primer login exitoso usando los metadatos que
// Supabase Auth guardó en el usuario al hacer signUp.
export async function upsertPerfil({ id, nombre, apellido }) {
  try {
    const profile = await prisma.profile.upsert({
      where: { id },
      update: {},
      create: { id, nombre: nombre || '', apellido: apellido || '' },
    });
    return { profile, error: null };
  } catch (error) {
    console.error('Error en upsertPerfil:', error);
    return { profile: null, error };
  }
}

// Actualiza los datos editables del perfil (nombre/apellido) de un usuario
// ya autenticado. Se usa desde la pantalla "Editar Perfil".
export async function actualizarPerfil({ id, nombre, apellido }) {
  try {
    const profile = await prisma.profile.update({
      where: { id },
      data: { nombre, apellido },
    });

    // El perfil se cacheó al leerse: invalidamos su entrada para que el nuevo
    // nombre/apellido se vea de inmediato sin esperar al TTL.
    removeCached(`perfil:${id}`);

    return { profile, error: null };
  } catch (error) {
    console.error('Error en actualizarPerfil:', error);
    return { profile: null, error };
  }
}