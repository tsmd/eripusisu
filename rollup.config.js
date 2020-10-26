import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/eripusisu.ts",
  output: {
    file: "dist/eripusisu.umd.js",
    format: "umd",
    name: "Eripusisu",
  },
  plugins: [typescript({ target: "ES5" })],
};
