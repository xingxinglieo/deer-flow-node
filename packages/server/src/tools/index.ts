export { executeJSCode } from './executeJSCode';
export { crawlTool } from './crawl';
export { tavilySearch } from './tavilySearch';

// 重新导出工具
// export {
//     nodeReplTool,
//     nodeCalculatorTool,
//     nodeDataTool,
//     packageInfoTool
// };

// // 工具配置接口
// export interface ExecutionToolsConfig {
//     enableNodeRepl?: boolean;
//     enablePythonRepl?: boolean;
//     enableCalculator?: boolean;
//     enableDataProcessing?: boolean;
//     preferPersistentPython?: boolean;
//     enableOnlinePython?: boolean;
// }

// // 根据配置选择合适的工具
// export function getExecutionTools(config: ExecutionToolsConfig = {}) {
//     const tools: any[] = [];

//     // Node.js 工具（默认启用）
//     if (config.enableNodeRepl !== false) {
//         tools.push(nodeReplTool);
//     }

//     if (config.enableCalculator !== false) {
//         tools.push(nodeCalculatorTool);
//     }

//     if (config.enableDataProcessing !== false) {
//         tools.push(nodeDataTool);
//     }

//     // 包信息工具（默认启用）
//     tools.push(packageInfoTool);

//     // TODO: Python 工具（待实现）
//     // if (config.enablePythonRepl) {
//     //     if (config.preferPersistentPython) {
//     //         tools.push(pythonReplPersistentTool);
//     //     } else {
//     //         tools.push(pythonReplTool);
//     //     }
//     // }

//     // TODO: 在线工具（待实现）
//     // if (config.enableOnlinePython) {
//     //     tools.push(onlinePythonTool);
//     // }

//     return tools;
// }

// // 预设配置
// export const ExecutionToolsPresets = {
//     // 基础配置：只有 Node.js 工具
//     basic: {
//         enableNodeRepl: true,
//         enableCalculator: true,
//         enableDataProcessing: false,
//         enablePythonRepl: false
//     },

//     // 完整配置：所有 Node.js 工具
//     full: {
//         enableNodeRepl: true,
//         enableCalculator: true,
//         enableDataProcessing: true,
//         enablePythonRepl: false
//     },

//     // 数据科学配置：包含 Python 支持
//     datascience: {
//         enableNodeRepl: true,
//         enableCalculator: true,
//         enableDataProcessing: true,
//         enablePythonRepl: true,
//         preferPersistentPython: true
//     },

//     // 开发配置：完整的开发工具
//     development: {
//         enableNodeRepl: true,
//         enableCalculator: true,
//         enableDataProcessing: true,
//         enablePythonRepl: true,
//         preferPersistentPython: false
//     }
// };
