import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), crx({ manifest }), tailwindcss()],

  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },

  // 构建配置
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        // 扩展的主入口
        popup: "./index.html",
      },
    },
  },

  // 开发模式下的输出目录
  publicDir: "public",

  // 确保在开发模式下也能正确处理扩展
  define: {
    __DEV__: JSON.stringify(true),
  },
});
