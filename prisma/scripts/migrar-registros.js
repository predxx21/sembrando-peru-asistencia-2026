// Script de migración para transicionar del sistema de evidencias al sistema de cronómetro
// Ejecutar con: node prisma/scripts/migrar-registros.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrar() {
  console.log('Iniciando migración del sistema de evidencias a cronómetro...');

  try {
    // 1. Marcar registros pendientes como aprobados
    const pendientes = await prisma.registroAsistencia.updateMany({
      where: { estado: 'pendiente' },
      data: { estado: 'aprobado' },
    });
    console.log(`✓ ${pendientes.count} registros pendientes marcados como aprobados`);

    // 2. Limpiar evidenciaUrl de registros existentes (datos huérfanos)
    const limpiados = await prisma.registroAsistencia.updateMany({
      where: { evidenciaUrl: { not: null } },
      data: { evidenciaUrl: null },
    });
    console.log(`✓ ${limpiados.count} registros limpiados de evidencias`);

    // 3. Asegurar que registros con estado null tengan 'aprobado'
    // Usamos Prisma SQL raw para evitar problemas con el enum
    const sinEstado = await prisma.$executeRaw`
      UPDATE "registroasistencia" SET estado = 'aprobado' WHERE estado IS NULL
    `;
    if (sinEstado > 0) {
      console.log(`✓ ${sinEstado} registros sin estado asignados a 'aprobado'`);
    }

    // 4. Asegurar sesionActiva = false para todos (por defecto en schema)
    const sesionesActivas = await prisma.registroAsistencia.updateMany({
      where: { sesionActiva: true },
      data: { sesionActiva: false },
    });
    if (sesionesActivas.count > 0) {
      console.log(`⚠ ${sesionesActivas.count} sesiones activas marcadas como inactivas (limpieza)`);
    }

    console.log('\n✅ Migración completada exitosamente');
    console.log('\nResumen:');
    console.log(`  - Registros aprobados: ${pendientes.count}`);
    console.log(`  - Evidencias limpiadas: ${limpiados.count}`);
    if (sinEstado > 0) console.log(`  - Estados corregidos: ${sinEstado}`);
    if (sesionesActivas.count > 0) console.log(`  - Sesiones activas limpiadas: ${sesionesActivas.count}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrar()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });