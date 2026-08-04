import { defineConfig } from "vitest/config";

/**
 * Setup enxuto de proposito. O guia do Next
 * (node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md) manda instalar
 * jsdom + @testing-library + @vitejs/plugin-react, mas aquilo serve pra testar
 * componente. Aqui so tem funcao pura de `src/lib/` — calculo, conversao e
 * montagem de resposta — entao `environment: "node"` basta e o teste roda rapido.
 *
 * Quem for testar componente depois acrescenta os plugins; nada aqui atrapalha.
 *
 * O guia tambem manda instalar `vite-tsconfig-paths` pro `@/...` funcionar, mas
 * o proprio Vite avisa que isso hoje e nativo — dai `resolve.tsconfigPaths`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
