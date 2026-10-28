import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { problemPilotApiPlugin } from './server/apiMiddleware.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    problemPilotApiPlugin(),
  ],
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
});
