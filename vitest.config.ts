import { defineConfig } from 'vitest/config';
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({

    plugins: [react(), tailwindcss(), tsconfigPaths()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: 'jsdom', // For React or DOM-based tests
        globals: true, // Enables Jest-like globals (e.g., describe, it, expect)
        setupFiles: 'src/tests/vitest.setup.ts', // Optional: For global test setup
    },
});
