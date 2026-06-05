import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both at the Pages root
// (https://<user>.github.io/Uniforms/) and inside PR-preview
// sub-paths (.../Uniforms/pr-preview/pr-N/). Every asset and image is
// resolved relative to index.html, so it doesn't matter how deep the
// page is served.
export default defineConfig({
  base: './',
  plugins: [react()],
});
