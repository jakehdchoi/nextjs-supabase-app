import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // 자동 생성 파일 및 빌드 결과물 제외
  {
    ignores: [".next/**", "out/**", "node_modules/**", "public/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  eslintConfigPrettier,
  {
    rules: {
      // TypeScript 강화
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // 코드 품질
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
