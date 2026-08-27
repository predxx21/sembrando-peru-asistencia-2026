-- Migration: Add Areas table, missing indexes, and migrate area data

-- 1. Create areas table
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- 2. Create unique index on area name
CREATE UNIQUE INDEX "areas_nombre_key" ON "areas"("nombre");

-- 3. Add areaId column to profiles (nullable for backward compat)
ALTER TABLE "profiles" ADD COLUMN "areaId" TEXT;

-- 4. Add foreign key constraint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Insert the 6 new areas (ordered)
INSERT INTO "areas" ("id", "nombre", "orden") VALUES
    (gen_random_uuid(), 'DDO', 1),
    (gen_random_uuid(), 'Gestión de Proyectos', 2),
    (gen_random_uuid(), 'Marketing', 3),
    (gen_random_uuid(), 'Fundraising', 4),
    (gen_random_uuid(), 'TI', 5),
    (gen_random_uuid(), 'Sensibilización', 6);

-- 6. Migrate existing profiles: map old area strings to new areas by name
--    Since old areas don't match new ones, we leave areaId NULL for existing
--    profiles (they'll need to select a new area on next profile edit)
--    This is intentional: old areas are deprecated and won't appear in selects
ALTER TABLE "registroasistencia"
ADD COLUMN "sesionActiva" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "registroasistencia"
ADD COLUMN "horaInicioReal" TIMESTAMP(3);
-- 7. Add missing indexes to registroasistencia
CREATE INDEX "registroasistencia_profileId_sesionActiva_idx"
    ON "registroasistencia"("profileId", "sesionActiva");

CREATE INDEX "registroasistencia_revisorId_idx"
    ON "registroasistencia"("revisorId");

CREATE INDEX "registroasistencia_estado_fechaRevision_idx"
    ON "registroasistencia"("estado", "fechaRevision");

CREATE INDEX "registroasistencia_profileId_estado_idx"
    ON "registroasistencia"("profileId", "estado");
