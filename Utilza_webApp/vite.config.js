import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev proxy: VITE_API_BASE_URL=/api/v1 -> http://localhost:4000/api/v1
// Backend default PORT=4000, CORS_ORIGIN includes http://localhost:5173.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
  },
});
