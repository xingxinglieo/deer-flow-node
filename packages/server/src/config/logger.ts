import { join } from 'path';
import { mkdirSync } from 'fs';
import { isDevelopment } from '~/utils';

// 确保日志目录存在
const logDir = join(process.cwd(), 'logs');
try {
  mkdirSync(logDir, { recursive: true });
} catch (err) {
  // 目录已存在，忽略错误
}

export const getLoggerConfig = () => {
  
  if (isDevelopment) {
    // 开发环境：美化输出 + 文件
    return {
      level: 'debug',
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
              singleLine: false
            }
          },
          {
            target: 'pino-roll',
            level: 'debug',
            options: {
              file: join(logDir, 'app-dev.log'),
              frequency: 'daily',
              size: '10m',
              mkdir: true
            }
          }
        ]
      }
    };
  } else {
    // 生产环境：JSON 格式 + 轮转
    return {
      level: 'info',
      transport: {
        targets: [
          {
            target: 'pino-roll',
            level: 'info', 
            options: {
              file: join(logDir, 'app.log'),
              frequency: 'daily',
              size: '50m',
              mkdir: true,
              limit: { count: 7 } // 保留7天
            }
          },
          {
            target: 'pino-roll',
            level: 'error',
            options: {
              file: join(logDir, 'error.log'),
              frequency: 'daily', 
              size: '20m',
              mkdir: true,
              limit: { count: 30 } // 错误日志保留30天
            }
          }
        ]
      }
    };
  }
};

export const LOG_DIRECTORY = logDir; 