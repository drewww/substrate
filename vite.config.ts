import { defineConfig } from "vite";

import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        display: 'src/display/test/index.html',
        // Add other test environments here as needed
      }
    }
  },
  server: {
    open: '/',
    port: 3000
  }
});
