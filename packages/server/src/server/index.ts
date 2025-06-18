import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { chatRoutes } from '../routes/chat';
import { mcpRoutes } from '../routes/mcp/index';

// import { socketRoutes } from '../routes/mcp/socket';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { errorHandler } from './error';
import { threadLoggerPlugin } from '../utils/logger';
import { getLoggerConfig } from '../config/logger';

const fastify = Fastify({
  logger: getLoggerConfig()
});

// Add schema validator and serializer
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// 注册线程日志插件
fastify.register(threadLoggerPlugin);
// 注册错误处理器
fastify.register(errorHandler);
// 注册 WebSocket 插件
fastify.register(websocket);
// 注册 CORS 插件
fastify.register(cors, {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: '*'
});

// 注册聊天路由
fastify.register(chatRoutes);

// 注册MCP路由
fastify.register(mcpRoutes);

// 注册Socket.IO和WebSocket
// fastify.register(socketRoutes);

// 健康检查端点
fastify.get('/health', async () => {
  return { code: 0, msg: 'DeerFlow Server is running!', data: null };
});

// 启动服务器
const start = async () => {
  try {
    const host = process.env.SERVER_HOST || 'localhost';
    const port = parseInt(process.env.SERVER_PORT || '8000');

    await fastify.listen({ host, port });
    console.log(`🦌 DeerFlow Server is running on http://${host}:${port}`);

    // 显示当前配置信息（调试用）
    if (process.env.DEBUG === 'true') {
      console.log('\n🔧 Current Configuration:');
      console.log(`   Host: ${host}`);
      console.log(`   Port: ${port}`);
      console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
