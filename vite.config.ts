import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import pandacss from "@pandacss/dev/postcss";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import babel from "vite-plugin-babel";

const ReactCompilerConfig = {
  /* ... */
};

export default defineConfig({
  css: {
    postcss: {
      plugins: [pandacss, autoprefixer],
    },
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    babel({
      filter: /\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
  ],
});
