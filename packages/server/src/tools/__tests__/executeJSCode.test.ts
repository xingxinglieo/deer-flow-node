import { describe, test, expect } from '@jest/globals';
import { _executeJSCode } from '../executeJSCode';

describe('_executeJSCode', () => {
  test('应该成功执行简单的数学计算', async () => {
    const code = `
      const result = 2 + 3;
      resolve(result);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: 5');
  });

  test('应该能够使用预加载的 lodash 库', async () => {
    const code = `
      const numbers = [1, 2, 3, 4, 5];
      const sum = lodash.sum(numbers);
      resolve(sum);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: 15');
  });

  test('应该能够使用 dayjs 库', async () => {
    const code = `
      const now = dayjs();
      const formatted = now.format('YYYY-MM-DD');
      resolve(formatted);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toMatch(/Result: \d{4}-\d{2}-\d{2}/);
  });

  test('应该能够使用 mathjs 库', async () => {
    const code = `
      const result = mathjs.evaluate('sqrt(16) + 2^3');
      resolve(result);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: 12');
  });

  test('应该禁用 require 并抛出错误', async () => {
    const code = `
      try {
        require('fs');
        resolve('should not reach here');
      } catch (error) {
        resolve(error.message);
      }
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Dynamic require() is disabled for security');
  });

  test('应该处理语法错误', async () => {
    const code = `
      const invalid = {;
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Error executing code');
  });

  test('应该验证输入类型', async () => {
    // @ts-ignore
    const output = await _executeJSCode({ code: 123 });
    
    expect(output).toContain('Error executing code');
    expect(output).toContain('Invalid input: code must be a string');
  });

  test('应该能够使用内置的 Math 对象', async () => {
    const code = `
      const result = Math.sqrt(16) + Math.pow(2, 3);
      resolve(result);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: 12');
  });

  test('应该能够使用 JSON 对象', async () => {
    const code = `
      const obj = { name: 'test', value: 42 };
      const jsonString = JSON.stringify(obj);
      const parsed = JSON.parse(jsonString);
      resolve(parsed.name);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: test');
  });

  test('应该能够处理数组操作', async () => {
    const code = `
      const numbers = [1, 2, 3, 4, 5];
      const doubled = numbers.map(n => n * 2);
      const sum = doubled.reduce((a, b) => a + b, 0);
      resolve(sum);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: 30');
  });

  test('应该能够处理异步操作', async () => {
    const code = `
      setTimeout(() => {
        resolve('async result');
      }, 100);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: async result');
  });

  test('应该能够处理 Promise', async () => {
    const code = `
      const promise = new Promise((resolve_inner) => {
        setTimeout(() => resolve_inner('promise result'), 50);
      });
      
      promise.then(result => {
        resolve(result);
      });
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: promise result');
  });

  test('应该处理超时情况', async () => {
    const code = `
      // 创建一个永远不会调用 resolve 的代码
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        // 永远不调用 resolve
      }, 100);
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Error executing code');
    expect(output).toContain('Timeout Error');
  }, 15000); // 增加测试超时时间

  test('应该能够使用 console 对象', async () => {
    const code = `
      console.log('This is a test log');
      resolve('console test completed');
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: console test completed');
  });

  test('应该能够使用 yahooFinance 库获取股票信息', async () => {
    const code = `
      // 测试 yahooFinance 库是否可用
      if (typeof yahooFinance !== 'undefined') {
        resolve('yahooFinance is available');
      } else {
        resolve('yahooFinance not available');
      }
    `;

    const output = await _executeJSCode({ code });
    
    expect(output).toContain('Successfully executed');
    expect(output).toContain('Result: yahooFinance is available');
  });
}); 