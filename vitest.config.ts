import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Stryker's dry run inherits CI=true; a stray focused test shouldn't abort it.
    allowOnly: true,
  },
});
