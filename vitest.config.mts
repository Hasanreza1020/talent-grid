import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "."),
      // `import "server-only"` throws outside a React Server Component, which
      // would mean the modules most worth testing — the ones holding keys and
      // access rules — are the ones that cannot be tested. The guard is for the
      // bundler; here it is a no-op.
      "server-only": resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
});
