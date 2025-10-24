import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// http://localhost:8000 is our FastAPI backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  },
  build: {
    outDir: 'dist'
  }
});
