import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // En dev el front corre en su propio puerto y Spring en el 8080. El proxy hace que el
    // navegador vea todo como mismo origen, asi que no hace falta CORS ni aqui ni en prod.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Spring Boot sirve como estatico lo que haya en resources/static, y ahi es donde el
    // SpaForwardingController reenvia las rutas de React Router. Compilar fuera de aqui
    // rompe el despliegue de un solo jar.
    outDir: path.resolve(import.meta.dirname, '../src/main/resources/static'),
    emptyOutDir: true,
  },
})
