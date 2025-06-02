#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const distPath = path.resolve(__dirname, "../dist");
const manifestPath = path.join(distPath, "manifest.json");

console.log("🚀 PeepCRX Chrome扩展安装指南\n");

if (!fs.existsSync(manifestPath)) {
  console.log("❌ 未找到构建文件，请先运行构建命令：");
  console.log("   pnpm build:dev  或  pnpm build\n");
  process.exit(1);
}

console.log("✅ 扩展已构建完成！\n");
console.log("📖 安装步骤：");
console.log("1. 打开Chrome浏览器");
console.log("2. 访问：chrome://extensions/");
console.log('3. 开启右上角的"开发者模式"');
console.log('4. 点击"加载已解压的扩展程序"');
console.log(`5. 选择目录：${distPath}`);
console.log("6. 点击扩展图标开始使用！\n");

console.log("🔄 开发提示：");
console.log("- 修改代码后运行 pnpm dev:build 自动重新构建");
console.log("- 在扩展管理页面点击刷新图标更新扩展");
console.log('- 右键扩展图标选择"检查弹出内容"进行调试\n');

console.log(`📁 扩展目录：${distPath}`);
