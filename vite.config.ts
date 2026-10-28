import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { problemPilotApiPlugin } from './src/server/apiMiddleware.ts';

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
});
