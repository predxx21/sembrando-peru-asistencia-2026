import './globals.css';

export const metadata = {
  title: 'Sistemas de Asistencia - Sembrando Perú',
  description: 'Acceso al sistema de asistencia de Sembrando Perú',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
