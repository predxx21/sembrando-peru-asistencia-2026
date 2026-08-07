import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Configuración de pruebas unitarias (Vitest). Solo se testean funciones
// puras (lib/utils/*), por eso el entorno es 'node' y no hace falta ningún
// plugin de React/JSX. El alias '@' replica el de Next.js para poder importar
// los utils con la misma ruta que el código de producción.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
