import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Deffered } from '~/utils';
import { VM } from 'vm2';
import lodash from 'lodash';
import dayjs from 'dayjs';
import axios from 'axios';
import danfojs from 'danfojs-node';
import * as mathjs from 'mathjs';
import yahooFinance from 'yahoo-finance2';

/**
 * 预加载的安全包和内置全局变量 - 作为全局变量提供
 */
const SAFE_GLOBAL_VARS = {
  // 实用工具库
  lodash: lodash,
  _: lodash,
  // 日期时间库
  dayjs,
  // HTTP 客户端
  axios,
  // 数据处理库（类似 pandas）
  danfojs,
  // 数学库（类似 numpy）
  mathjs,
  // 金融数据库（类似 yfinance）
  yahooFinance,

  // 内置全局变量
  console,
  Math,
  Date,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  Promise,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  resolve: () => {}
};

/**
 * 执行 Node.js 代码的核心函数 - 安全版本
 */
const EXCUTE_TIMEOUT = 10000;

export const _executeJSCode = async function ({ code }: { code: string }): Promise<string> {
  const deffered = new Deffered();
  const timeoutId = setTimeout(() => {
    deffered.reject(new Error('Timeout Error'));
  }, EXCUTE_TIMEOUT);
  
  try {
    if (typeof code !== 'string') {
      throw new Error(`Invalid input: code must be a string, got ${typeof code}`);
    }

    // 创建基础沙箱环境
    const sandbox: Record<string, any> = {
      ...SAFE_GLOBAL_VARS,
      resolve: (result: any) => {
        clearTimeout(timeoutId);
        deffered.resolve(result);
      },
      // 禁用 require - 抛出明确的错误信息
      require: () => {
        throw new Error(
          'Dynamic require() is disabled for security. Use pre-loaded packages: ' +
            Object.keys(SAFE_GLOBAL_VARS).join(', ')
        );
      }
    };

    //   // 注入传入的全局变量
    //   if (globalVars) {
    //     Object.assign(sandbox, globalVars);
    //   }

    // 创建 vm2 实例
    const vm = new VM({
      timeout: EXCUTE_TIMEOUT,
      sandbox
    });
    console.info(`Executing Javascript code`);
    // 执行代码
    vm.run(code);

    const result = await deffered.promise;
    return `Successfully executed:\n\`\`\`javascript\n${code}\n\`\`\`\nResult: ${JSON.stringify(result)}`;
  } catch (error) {
    clearTimeout(timeoutId);
    return `Error executing code:\n\`\`\`javascript\n${code}\n\`\`\`\nError: ${error}`;
  }
}

export const executeJSCode = tool(
  _executeJSCode,
  {
    name: 'execute_js_code',
    description: `Use this to execute javascript code and do further analysis or calculation. Available global variables and libraries(Don't import any packages): ${Object.keys(SAFE_GLOBAL_VARS).join(', ')}. If you want to see the output of a value, 
    you should print it out with \`resolve(...)\`. This is visible to the user.`,
    schema: z.object({
      code: z
        .string()
        .describe(
          `The javascript to execute to do further analysis or calculation. Available global variables and libraries(Don't import any packages): ${Object.keys(SAFE_GLOBAL_VARS).join(', ')}.`
        )
    })
  }
);
