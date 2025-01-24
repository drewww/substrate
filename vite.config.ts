import { defineConfig } from "vite";

import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
        game: 'src/game/test/index.html',
      }
    },
    outDir: 'dist',
    assetsDir: '.',
  },
  server: {
    open: '/',
    port: 3000
  }
});
