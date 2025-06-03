// vite.config.ts
import { reactRouter } from "file:///Users/chanakan5591/Developments/carbonyx/.yarn/__virtual__/@react-router-dev-virtual-b61c862090/3/.yarn/berry/cache/@react-router-dev-npm-7.6.0-3b079addf8-10c0.zip/node_modules/@react-router/dev/dist/vite.js";
import autoprefixer from "file:///Users/chanakan5591/Developments/carbonyx/.yarn/__virtual__/autoprefixer-virtual-62e5fc2175/3/.yarn/berry/cache/autoprefixer-npm-10.4.21-0dd6f0f60c-10c0.zip/node_modules/autoprefixer/lib/autoprefixer.js";
import pandacss from "file:///Users/chanakan5591/.yarn/berry/cache/@pandacss-dev-npm-0.53.6-0ddc16ba4e-10c0.zip/node_modules/@pandacss/dev/postcss.js";
import { defineConfig } from "file:///Users/chanakan5591/Developments/carbonyx/.yarn/__virtual__/vite-virtual-96dc4b08bf/3/.yarn/berry/cache/vite-npm-5.4.19-6d369030b0-10c0.zip/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/chanakan5591/Developments/carbonyx/.yarn/__virtual__/vite-tsconfig-paths-virtual-08310b838c/3/.yarn/berry/cache/vite-tsconfig-paths-npm-5.1.4-7b9978a4d1-10c0.zip/node_modules/vite-tsconfig-paths/dist/index.js";
import babel from "file:///Users/chanakan5591/Developments/carbonyx/.yarn/__virtual__/vite-plugin-babel-virtual-7b533f54a3/3/.yarn/berry/cache/vite-plugin-babel-npm-1.3.1-29fe2c51d0-10c0.zip/node_modules/vite-plugin-babel/dist/index.mjs";
var ReactCompilerConfig = {
  /* ... */
};
var vite_config_default = defineConfig({
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
export { vite_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hhbmFrYW41NTkxL0RldmVsb3BtZW50cy9jYXJib255eFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2NoYW5ha2FuNTU5MS9EZXZlbG9wbWVudHMvY2FyYm9ueXgvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2NoYW5ha2FuNTU5MS9EZXZlbG9wbWVudHMvY2FyYm9ueXgvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZWFjdFJvdXRlciB9IGZyb20gXCJAcmVhY3Qtcm91dGVyL2Rldi92aXRlXCI7XG5pbXBvcnQgYXV0b3ByZWZpeGVyIGZyb20gXCJhdXRvcHJlZml4ZXJcIjtcbmltcG9ydCBwYW5kYWNzcyBmcm9tICdAcGFuZGFjc3MvZGV2L3Bvc3Rjc3MnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSBcInZpdGUtdHNjb25maWctcGF0aHNcIjtcbmltcG9ydCBiYWJlbCBmcm9tICd2aXRlLXBsdWdpbi1iYWJlbCdcblxuY29uc3QgUmVhY3RDb21waWxlckNvbmZpZyA9IHsgLyogLi4uICovIH07XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGNzczoge1xuICAgIHBvc3Rjc3M6IHtcbiAgICAgIHBsdWdpbnM6IFtwYW5kYWNzcywgYXV0b3ByZWZpeGVyXSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3RSb3V0ZXIoKSxcbiAgICB0c2NvbmZpZ1BhdGhzKCksXG4gICAgYmFiZWwoe1xuICAgICAgZmlsdGVyOiAvXFwuW2p0XXN4PyQvLFxuICAgICAgYmFiZWxDb25maWc6IHtcbiAgICAgICAgcHJlc2V0czogW1wiQGJhYmVsL3ByZXNldC10eXBlc2NyaXB0XCJdLFxuICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgW1wiYmFiZWwtcGx1Z2luLXJlYWN0LWNvbXBpbGVyXCIsIFJlYWN0Q29tcGlsZXJDb25maWddXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICBdLFxuXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlMsU0FBUyxtQkFBbUI7QUFDelUsT0FBTyxrQkFBa0I7QUFDekIsT0FBTyxjQUFjO0FBQ3JCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sV0FBVztBQUVsQixJQUFNLHNCQUFzQjtBQUFBO0FBQVk7QUFFeEMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsS0FBSztBQUFBLElBQ0gsU0FBUztBQUFBLE1BQ1AsU0FBUyxDQUFDLFVBQVUsWUFBWTtBQUFBLElBQ2xDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLElBQ2QsTUFBTTtBQUFBLE1BQ0osUUFBUTtBQUFBLE1BQ1IsYUFBYTtBQUFBLFFBQ1gsU0FBUyxDQUFDLDBCQUEwQjtBQUFBLFFBQ3BDLFNBQVM7QUFBQSxVQUNQLENBQUMsK0JBQStCLG1CQUFtQjtBQUFBLFFBQ3JEO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
