import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * ESLint flat config. Next's recommended rules (core-web-vitals + typescript),
 * with eslint-config-prettier last so Prettier owns formatting (no rule fights).
 *
 * Registry-managed trees (shadcn / base-nova primitives, installed not
 * hand-written) are ignored — linting generated code we never edit only adds
 * noise, and it keeps its own upstream style.
 */
const config = [
  {
    ignores: [".next/**", "dist/**", "data/**", ".context/**", "src/components/ui/**"],
  },
  ...next,
  ...nextTypescript,
  prettier,
];

export default config;
