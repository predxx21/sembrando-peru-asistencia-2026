-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('voluntario', 'admin');

-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'voluntario',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registroasistencia" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT NOT NULL,
    "evidenciaUrl" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'pendiente',
    "comentarioRevision" TEXT,
    "revisorId" TEXT,
    "fechaRevision" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registroasistencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "registroasistencia" ADD CONSTRAINT "registroasistencia_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registroasistencia" ADD CONSTRAINT "registroasistencia_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
