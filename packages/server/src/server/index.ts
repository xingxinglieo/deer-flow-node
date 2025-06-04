import Fastify from 'fastify';
import cors from '@fastify/cors';
import { chatRoutes } from '../routes/chat';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { errorHandler } from './error';

const fastify = Fastify({
  logger: true
});

// Add schema validator and serializer
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// 注册错误处理器
fastify.register(errorHandler);
// 注册 CORS 插件
fastify.register(cors, {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  // origin: [
  //   'https://hoppscotch.io',
  //   process.env.CORS_ORIGIN || 'http://localhost:3000',
  // ]
});

// 注册聊天路由
fastify.register(chatRoutes);

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
      console.log(`   CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start(); 