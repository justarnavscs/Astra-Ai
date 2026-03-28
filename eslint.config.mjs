import path from "node:path";
import { defineConfig } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: path.resolve(),
});

export default defineConfig([
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
]);
