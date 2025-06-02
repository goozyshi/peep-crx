# PeepCRX 开发指南

## 🚀 开发模式

### 方式 1：开发服务器（推荐用于 UI 开发）

```bash
pnpm dev
```

- 启动开发服务器：http://localhost:5173
- 支持热重载和 Vue DevTools
- 适合 UI 组件开发和调试

### 方式 2：构建模式（用于扩展预览）

```bash
pnpm dev:build
```

- 监听文件变化并自动构建到 `dist/` 目录
- 构建后可在 Chrome 中加载扩展进行预览
- 适合完整扩展功能测试

## 📦 在 Chrome 中安装扩展

1. 运行 `pnpm dev:build` 或 `pnpm build:dev`
2. 打开 Chrome 浏览器
3. 进入 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择项目的 `dist/` 目录
7. 扩展安装完成！

## 🔄 开发流程

### UI 开发流程：

```bash
# 启动开发服务器
pnpm dev

# 在浏览器中访问 http://localhost:5173
# 进行UI开发和调试
```

### 扩展功能测试：

```bash
# 启动监听构建
pnpm dev:build

# 在Chrome中加载扩展（仅需首次）
# 1. chrome://extensions/
# 2. 开启开发者模式
# 3. 加载已解压的扩展 -> 选择 dist 目录

# 修改代码后会自动重新构建
# 在扩展管理页面点击刷新按钮即可更新扩展
```

## 🛠️ 可用命令

| 命令              | 说明                      |
| ----------------- | ------------------------- |
| `pnpm dev`        | 启动开发服务器（UI 开发） |
| `pnpm dev:build`  | 监听模式构建（扩展预览）  |
| `pnpm build:dev`  | 单次开发构建              |
| `pnpm build`      | 生产构建                  |
| `pnpm preview`    | 预览生产构建              |
| `pnpm type-check` | TypeScript 类型检查       |

## 🐛 调试技巧

### Vue DevTools

- 在开发服务器模式下（`pnpm dev`）可使用 Vue DevTools
- 访问 http://localhost:5173

### Chrome 扩展调试

- 右键扩展图标 → "检查弹出内容"
- 或在 `chrome://extensions/` 中点击"背景页面"进行调试

### 热重载

- UI 开发：自动热重载
- 扩展开发：文件变化后在扩展管理页面手动刷新

## 📝 注意事项

1. **端口占用**：开发服务器使用 5173 端口，HMR 使用 5174 端口
2. **扩展权限**：manifest.json 中的权限修改需要重新加载扩展
3. **存储调试**：可在 Chrome DevTools → Application → Storage 中查看扩展存储数据
4. **跨域问题**：开发服务器模式可能有跨域限制，扩展模式无此问题
