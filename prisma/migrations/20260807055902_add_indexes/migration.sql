-- CreateIndex
CREATE INDEX "registroasistencia_profileId_idx" ON "registroasistencia"("profileId");

-- CreateIndex
CREATE INDEX "registroasistencia_estado_idx" ON "registroasistencia"("estado");

-- CreateIndex
CREATE INDEX "registroasistencia_fecha_idx" ON "registroasistencia"("fecha");

-- CreateIndex
CREATE INDEX "registroasistencia_fechaRevision_idx" ON "registroasistencia"("fechaRevision");

-- CreateIndex
CREATE INDEX "registroasistencia_estado_fecha_idx" ON "registroasistencia"("estado", "fecha");
