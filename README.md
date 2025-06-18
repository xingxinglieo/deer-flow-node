# 🦌 DeerFlow Node.js

Node.js 版本的 DeerFlow - 深度探索和高效研究流程框架，原 [Python 版本](https://github.com/bytedance/deer-flow)

体检地址：http://1.94.188.202/chat

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
- pnpm 8.9.2(建议使用 corepack enable 锁定版本)

### 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd deer-flow-node

# 安装所有依赖
pnpm i
```

### 环境配置

编辑 .env 文件，填入你的 API 密钥，必要配置 ：
1. 模型 OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL
2. AI 搜索 TAVILY_API_KEY

packages/server/.env
```
# 服务端配置
# SERVER_PORT=8000
# SERVER_HOST=localhost
# NODE_ENV=development

# DEBUG=true

# OpenAI 配置，已测试服务商阿里云千问、豆包、硅基流动
# OPENAI_API_KEY=xxx
# OPENAI_BASE_URL=xxx
# OPENAI_MODEL=xxx

# Web 抓取配置，仅支持 Tavily，支持多个 Tavily Key 逗号分割
# Tavily Search API
# TAVILY_API_KEY=tvly-dev-abcd,tvly-dev-efgg

# JINA_API_KEY=your_jina_api_key_here
# USER_AGENT=DeerFlow/1.0

# langsmith
# LANGSMITH_TRACING=true
# LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
# LANGSMITH_API_KEY=xxx
# LANGSMITH_PROJECT="xxx"

```

packages/web/.env
```
# 前端请求接口 BASE_URL，与 server 一致
NEXT_PUBLIC_API_URL=http://localhost:8000/api
# 端口配置
PORT=3000
```



### 开发模式

```bash
# 同时启动服务端和前端 (推荐)
pnpm dev

# 或者分别启动
pnpm --filter @deerflow/server dev    # 启动后端开发服务器
pnpm --filter @deerflow/web dev       # 启动前端开发服务器
```

### 构建和部署

```bash
# 构建所有包
pnpm build

# 生产环境启动 (使用 Node.js 直接运行)
pnpm start

# 先构建后端
pnpm --filter @deerflow/server build
# 使用 PM2 启动
pnpm --filter @deerflow/server start
```

## 🏗️ 技术栈

### 服务端 (`@deerflow/server`)
- **运行时**: Node.js 18+ + TypeScript
- **Web 框架**: Fastify + WebSocket
- **AI 集成**: LangChain + LangGraph + OpenAI
- **爬虫工具**: Puppeteer + Cheerio + Axios
- **数据处理**: danfojs-node + mathjs
- **文档处理**: Mozilla Readability + Turndown + markdown-it
- **安全沙箱**: vm2
- **日志**: Winston
- **构建工具**: TypeScript Compiler + tsc-alias
- **开发工具**: tsx (开发服务器) + Jest (测试) + dotenvx (环境变量)

### 前端 (`@deerflow/web`)
- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS + CSS Modules
- **UI 组件**: Radix UI + Custom Components
- **状态管理**: Zustand + React Context
- **动画**: Framer Motion + Magic UI
- **编辑器**: ProseMirror (富文本编辑)
- **实时通信**: Socket.IO Client
- **工具库**: clsx + cn (样式工具)


## 🎯 功能模块

### ✅ 已复刻功能

#### **核心工作流引擎**
- ✅ **LangGraph 状态管理**：多智能体协作状态流转
- ✅ **智能体节点系统**：模块化的智能体节点架构
- ✅ **条件路由逻辑**：基于状态的智能路由决策

#### **智能体角色**
- ✅ **协调员 (Coordinator)**：任务分发和流程控制
- ✅ **规划师 (Planner)**：研究计划制定和步骤拆解
- ✅ **报告员 (Reporter)**：最终报告生成和格式化
- ✅ **研究团队 (Research Team)**：任务分配和协作管理
- ✅ **研究员 (Researcher)**：信息收集和分析
- ✅ **程序员 (Coder)**：代码执行和数据处理
- ✅ **人工反馈 (Human Feedback)**：交互式用户反馈
- ✅ **背景调研员 (Background Investigator)**：背景信息收集

#### **前端界面**
- ✅ **聊天界面**：流式对话交互
- ✅ **设置面板**：系统配置管理

#### **工具集成**
- ✅ **网页爬虫**：JINA 爬去网页
- ✅ **AI 搜索**：Tavily API 集成
- ✅ **代码执行**：安全的 JS 代码沙箱环境
- ✅ **MCP 工具加载**：加载 MCP 工具，仅支持 SSE

#### **回放**
- ✅ **回放录制**：自动录制回放，仅开发模式可用

### 📋 待开发功能

#### **RAG (检索增强生成)**
- 🚧 **文档检索**：客户端暂不支持

#### **多媒体生成**
- ⏳ **PPT 生成**：自动化演示文稿制作
- ⏳ **播客生成**：文本转语音播客制作
- ⏳ **文档优化**：智能文档润色和改进



## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情 