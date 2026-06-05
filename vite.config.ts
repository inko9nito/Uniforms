import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set to the repo name so assets resolve correctly on
// GitHub Pages (https://<user>.github.io/Uniforms/).
export default defineConfig({
  base: '/Uniforms/',
  plugins: [react()],
});
