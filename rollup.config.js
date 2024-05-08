import typescript from "@rollup/plugin-typescript";
// Not working in node 22 yet. See: https://github.com/Shopify/shopify-app-template-remix/issues/695
// import packageJson from "./package.json" assert { type: "json" };

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "./dist/index.mjs",
        format: "es",
        sourcemap: false,
      }
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.esm.json",
        sourceMap: false,
      }),
    ],
  },
];