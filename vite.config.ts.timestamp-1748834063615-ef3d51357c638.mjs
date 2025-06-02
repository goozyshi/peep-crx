// vite.config.ts
import { defineConfig } from "file:///Users/zackshi/peep-crx/node_modules/.pnpm/vite@5.4.6_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/zackshi/peep-crx/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vite@5.4.6_lightningcss@1.30.1__vue@3.5.16_typescript@5.8.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import tailwindcss from "file:///Users/zackshi/peep-crx/node_modules/.pnpm/@tailwindcss+vite@4.1.8_vite@5.4.6_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
import { crx } from "file:///Users/zackshi/peep-crx/node_modules/.pnpm/@crxjs+vite-plugin@2.0.0-beta.33/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// manifest.json
var manifest_default = {
  manifest_version: 3,
  name: "Peep",
  version: "0.0.1",
  action: {
    default_popup: "index.html"
  },
  permissions: ["storage", "tabs"]
};

// vite.config.ts
var vite_config_default = defineConfig({
  plugins: [vue(), crx({ manifest: manifest_default }), tailwindcss()],
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174
    }
  },
  // 构建配置
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        // 扩展的主入口
        popup: "./index.html"
      }
    }
  },
  // 开发模式下的输出目录
  publicDir: "public",
  // 确保在开发模式下也能正确处理扩展
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development")
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy96YWNrc2hpL3BlZXAtY3J4XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvemFja3NoaS9wZWVwLWNyeC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvemFja3NoaS9wZWVwLWNyeC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgdnVlIGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWVcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcbmltcG9ydCB7IGNyeCB9IGZyb20gXCJAY3J4anMvdml0ZS1wbHVnaW5cIjtcbmltcG9ydCBtYW5pZmVzdCBmcm9tIFwiLi9tYW5pZmVzdC5qc29uXCI7XG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFt2dWUoKSwgY3J4KHsgbWFuaWZlc3QgfSksIHRhaWx3aW5kY3NzKCldLFxuXG4gIC8vIFx1NUYwMFx1NTNEMVx1NjcwRFx1NTJBMVx1NTY2OFx1OTE0RFx1N0Y2RVxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBwb3J0OiA1MTc0LFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gXHU2Nzg0XHU1RUZBXHU5MTREXHU3RjZFXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiBcImRpc3RcIixcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICAvLyBcdTYyNjlcdTVDNTVcdTc2ODRcdTRFM0JcdTUxNjVcdTUzRTNcbiAgICAgICAgcG9wdXA6IFwiLi9pbmRleC5odG1sXCIsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gXHU1RjAwXHU1M0QxXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0XHU4RjkzXHU1MUZBXHU3NkVFXHU1RjU1XG4gIHB1YmxpY0RpcjogXCJwdWJsaWNcIixcblxuICAvLyBcdTc4NkVcdTRGRERcdTU3MjhcdTVGMDBcdTUzRDFcdTZBMjFcdTVGMEZcdTRFMEJcdTRFNUZcdTgwRkRcdTZCNjNcdTc4NkVcdTU5MDRcdTc0MDZcdTYyNjlcdTVDNTVcbiAgZGVmaW5lOiB7XG4gICAgX19ERVZfXzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwiZGV2ZWxvcG1lbnRcIiksXG4gIH0sXG59KTtcbiIsICJ7XG4gIFwibWFuaWZlc3RfdmVyc2lvblwiOiAzLFxuICBcIm5hbWVcIjogXCJQZWVwXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiYWN0aW9uXCI6IHtcbiAgICBcImRlZmF1bHRfcG9wdXBcIjogXCJpbmRleC5odG1sXCJcbiAgfSxcbiAgXCJwZXJtaXNzaW9uc1wiOiBbXCJzdG9yYWdlXCIsIFwidGFic1wiXVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UCxTQUFTLG9CQUFvQjtBQUNwUixPQUFPLFNBQVM7QUFDaEIsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxXQUFXOzs7QUNIcEI7QUFBQSxFQUNFLGtCQUFvQjtBQUFBLEVBQ3BCLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLFFBQVU7QUFBQSxJQUNSLGVBQWlCO0FBQUEsRUFDbkI7QUFBQSxFQUNBLGFBQWUsQ0FBQyxXQUFXLE1BQU07QUFDbkM7OztBREZBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFFLDJCQUFTLENBQUMsR0FBRyxZQUFZLENBQUM7QUFBQTtBQUFBLEVBR2pELFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEtBQUs7QUFBQSxNQUNILE1BQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUE7QUFBQSxRQUVMLE9BQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsV0FBVztBQUFBO0FBQUEsRUFHWCxRQUFRO0FBQUEsSUFDTixTQUFTLEtBQUssVUFBVSxRQUFRLElBQUksYUFBYSxhQUFhO0FBQUEsRUFDaEU7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
