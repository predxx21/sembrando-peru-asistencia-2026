// Datos de ejemplo para el panel de administración.
// TODO: reemplazar por datos reales desde el backend (API/BD).

export const submissions = [
  {
    id: "VL-9032",
    name: "Jane Doe",
    initials: "JD",
    avatarColor: "#2f6fed",
    date: "24 Oct, 2023",
    type: "Trabajo de Campo",
    duration: "4.5 hrs",
    status: "pendiente",
    description:
      "Distribución de kits de higiene y apoyo logístico en el centro comunitario sector sur. Se atendieron a 45 familias damnificadas y se organizó el inventario restante en bodega.",
    location: "Sector Sur, Centro Comunitario",
    evidencePhoto: "/images/reforestacion-sembrando-peru.jpg",
    evidenceFileName: "evidencia_campo_sur.jpg",
    evidenceFileSize: "2.4 MB",
  },
  {
    id: "VL-8821",
    name: "Marcus Smith",
    initials: "MS",
    avatarColor: "#2f9e6f",
    date: "23 Oct, 2023",
    type: "Administrativo",
    duration: "2.0 hrs",
    status: "pendiente",
    description:
      "Actualización del inventario de herramientas y materiales en el almacén central, previo a la jornada de reforestación de la próxima semana.",
    location: "Almacén Central, Sede Lima",
    evidencePhoto: "/images/bosque-sembrando-peru.jpg",
    evidenceFileName: "evidencia_inventario.jpg",
    evidenceFileSize: "1.8 MB",
  },
  {
    id: "VL-9104",
    name: "Aisha Rashid",
    initials: "AR",
    avatarColor: "#e08a2c",
    date: "22 Oct, 2023",
    type: "Alcance Comunitario",
    duration: "6.0 hrs",
    status: "pendiente",
    description:
      "Jornada de sensibilización ambiental con familias de la comunidad, incluyendo recorrido por las zonas reforestadas y registro fotográfico del avance.",
    location: "Zona de Reforestación, Sector Norte",
    evidencePhoto: "/images/reforestacion-sembrando-peru.jpg",
    evidenceFileName: "evidencia_alcance_comunitario.jpg",
    evidenceFileSize: "3.1 MB",
  },
  {
    id: "VL-8440",
    name: "Kevin Lee",
    initials: "KL",
    avatarColor: "#8b7ce0",
    date: "22 Oct, 2023",
    type: "Trabajo de Campo",
    duration: "3.5 hrs",
    status: "pendiente",
    description:
      "Apoyo en la siembra de plantones en la zona designada, junto con el registro fotográfico del estado del terreno antes de iniciar la actividad.",
    location: "Vivero Comunitario, Sector Este",
    evidencePhoto: "/images/bosque-sembrando-peru.jpg",
    evidenceFileName: "evidencia_siembra.jpg",
    evidenceFileSize: "2.0 MB",
  },
];

export function getSubmissionById(id) {
  return submissions.find((submission) => submission.id === id) ?? null;
}
