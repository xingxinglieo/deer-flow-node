# 🦌 DeerFlow Node.js

Node.js 版本的 DeerFlow - 深度探索和高效研究流程框架

## 📦 Monorepo 结构

这是一个使用 pnpm workspaces 管理的 monorepo 项目：

```
deer-flow-node/
├── packages/
│   ├── server/          # 后端 API 服务 (Fastify + TypeScript)
│   └── web/             # 前端 Web 应用 (Next.js + React)
├── package.json         # 根配置文件
├── pnpm-workspace.yaml  # pnpm workspace 配置
└── tsconfig.json        # TypeScript 根配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd deer-flow-node

# 安装所有依赖
pnpm install
```

### 环境配置

```bash
# 复制环境变量文件
cp env.example .env

# 编辑 .env 文件，填入你的 API 密钥
# 至少需要配置 OPENAI_API_KEY 和一个搜索引擎 API
```

### 开发模式

```bash
# 同时启动服务端和前端 (推荐)
pnpm dev

# 或者分别启动
pnpm dev:server  # 启动后端服务 (http://localhost:8000)
pnpm dev:web     # 启动前端服务 (http://localhost:3000)
```

### 构建项目

```bash
# 构建所有包
pnpm build

# 生产环境启动
pnpm start
```

## 📋 可用脚本

### 根级别脚本

- `pnpm dev` - 并行启动所有开发服务器
- `pnpm build` - 构建所有包
- `pnpm test` - 运行所有测试
- `pnpm lint` - 检查代码风格
- `pnpm format` - 格式化代码

### 包级别脚本

```bash
# 只运行服务端
pnpm --filter server dev
pnpm --filter server build
pnpm --filter server test

# 只运行前端
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
```

## 🏗️ 技术栈

### 服务端 (`@deerflow/server`)
- **运行时**: Node.js + TypeScript
- **Web 框架**: Fastify
- **AI 集成**: OpenAI API
- **工具**: Axios, Cheerio, Puppeteer
- **开发工具**: tsx, Jest

### 前端 (`@deerflow/web`)
- **框架**: Next.js 14 + React 18
- **样式**: Tailwind CSS
- **组件**: Radix UI
- **状态管理**: Zustand
- **动画**: Framer Motion
- **实时通信**: Socket.IO

## 🔧 开发指南

### 添加新的依赖

```bash
# 为特定包添加依赖
pnpm --filter server add express
pnpm --filter web add @types/react

# 为根项目添加开发依赖
pnpm add -w -D prettier
```

### 包之间的依赖

```bash
# 在 web 包中引用 server 包
pnpm --filter web add @deerflow/server@workspace:*
```

### 代码风格

- 使用 ESLint + Prettier 进行代码格式化
- 遵循 TypeScript 严格模式
- 使用 conventional commits 规范

## 📚 下一步计划

1. ✅ **阶段 1**: 基础架构搭建 (当前)
2. 🔄 **阶段 2**: LLM 集成与基础代理
3. 📋 **阶段 3**: 工具系统实现
4. 🔀 **阶段 4**: 工作流引擎
5. 🌐 **阶段 5**: Web UI 与实时通信

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情 