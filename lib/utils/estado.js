// Etiquetas compartidas de los estados de un registro de asistencia.
//
// Antes cada componente (ListadoHistorial, VerEvidencia, PanelVoluntario,
// EvidenceReview) repetía los mismos 3 textos. El mapeo a clases de CSS sigue
// siendo propio de cada uno (usan módulos CSS distintos), pero la etiqueta
// vive aquí una sola vez.
export const ESTADO_LABEL = {
  aprobado: 'Aprobado',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado',
};