# 🚽 PeepCRX - 智能洗手间空位预测

一款基于众包数据的智能洗手间空位预测 Chrome 扩展。通过用户协作记录洗手间状态，运用先进的统计学习算法，为用户预测最佳如厕时段，有效避开高峰期，提升使用体验。

## ✨ 特性

- 🎯 **智能预测**: 基于历史数据预测最佳如厕时段
- 📊 **可视化**: 直观的时段繁忙程度显示
- 🏢 **多位置支持**: 管理多个洗手间位置
- ⚡ **快速记录**: 一键记录当前厕所状态
- 🔒 **隐私保护**: 所有数据仅存储在本地
- 🎨 **现代 UI**: 美观的界面设计

## 🚀 快速开始

### 开发环境

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd peep-crx
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **开发模式**

   ```bash
   # UI开发模式（推荐）
   npm run dev
   # 访问 http://localhost:5173

   # 扩展预览模式
   npm run dev:build
   ```

4. **在 Chrome 中安装扩展**

   ```bash
   # 构建扩展
   npm run build:dev

   # 显示安装指导
   npm run install-guide
   ```

   然后在 Chrome 中：

   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist/` 目录

### 生产构建

```bash
npm run build
```

## 📖 使用说明

### 首次使用

1. **设置位置**: 首次打开时，需要设置你常去的厕所位置和坑位数量
2. **开始记录**: 每次去厕所发现没位置时，记录一下当前状态
3. **查看预测**: 系统会学习并预测最佳如厕时间

### 主要功能

#### 🔮 预测功能

- 查看当前时段的繁忙程度
- 浏览全天 24 小时预测
- 获取推荐的最佳时段

#### 📝 记录功能

- 快速记录：一键标记"厕所满了"或"有空位"
- 详细记录：查看和管理历史记录
- 自动分析：系统自动学习使用模式

#### ⚙️ 设置功能

- 多位置管理：添加和切换不同位置
- 使用统计：查看记录数量和位置信息
- 数据导出：备份你的使用数据

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite 5
- **UI 框架**: TailwindCSS 4
- **扩展框架**: @crxjs/vite-plugin
- **统计计算**: simple-statistics
- **存储**: Chrome Storage API + localStorage

## 🎯 开发命令

| 命令                    | 说明                      |
| ----------------------- | ------------------------- |
| `npm run dev`           | 启动开发服务器（UI 开发） |
| `npm run dev:build`     | 监听模式构建（扩展预览）  |
| `npm run build:dev`     | 单次开发构建              |
| `npm run build`         | 生产构建                  |
| `npm run preview`       | 预览生产构建              |
| `npm run type-check`    | TypeScript 类型检查       |
| `npm run install-guide` | 显示扩展安装指导          |

## 🐛 调试指南

### Vue 开发调试

- 使用 `npm run dev` 启动开发服务器
- 在浏览器中访问 http://localhost:5173
- 使用 Vue DevTools 进行调试

### Chrome 扩展调试

- 使用 `npm run dev:build` 构建扩展
- 在 Chrome 中加载扩展
- 右键扩展图标选择"检查弹出内容"进行调试

### 常见问题

- **端口占用**: 开发服务器使用 5173 端口，HMR 使用 5174 端口
- **权限问题**: manifest.json 权限修改需要重新加载扩展
- **存储调试**: 在 Chrome DevTools → Application → Storage 中查看数据

## 📊 数据说明

### 数据类型

- **位置数据**: 厕所位置名称、坑位数量等基础信息
- **记录数据**: 时间戳、位置 ID、状态（满/空）
- **预测数据**: 基于历史数据计算的时段繁忙程度

### 隐私保护

- 所有数据仅存储在用户设备本地
- 不收集任何个人身份信息
- 不向任何服务器发送数据
- 用户可随时删除所有数据

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- Vue.js 团队提供的优秀框架
- TailwindCSS 提供的美观 UI 组件
- Chrome Extensions API 文档和社区支持

---

**Made with ❤️ for better bathroom experiences**
