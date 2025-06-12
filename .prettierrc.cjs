// 配置可参考 https://ier.io/en/configuration.html
// eslint-disable-next-line no-undef
module.exports = {
  // 使用较大的打印宽度，因为 ier 的换行设置似乎是针对没有注释的 JavaScript.
  printWidth: 120,
  // 使用 .gitattributes 来管理换行
  endOfLine: 'auto',

  // 单引号代替双引号
  singleQuote: true,

  // 对于 ES5 而言, 尾逗号不能用于函数参数，因此使用它们只能用于数组
  trailingComma: 'none',

  // 分号
  semi: true,
  // jsx 字符串是否单引号
  jsxSingleQuote: false,
  // 函数名字后的空格
  spaceBeforeFunctionParen: true,
  // 箭头函数单个参数时是否加括号
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  experimentalTernaries: false,
  quoteProps: 'as-needed',
  singleAttributePerLine: true,
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  proseWrap: 'preserve',
  insertPragma: false,
  requirePragma: false,
  tabWidth: 2,
  useTabs: false,
  embeddedLanguageFormatting: 'auto'
};
