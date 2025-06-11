module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  plugins: [
    'import'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 核心规则 - 变量相关
    'no-undef': 'error',          // 使用未定义的变量
    'no-unused-vars': 'error',   // 声明但未使用的变量

    // import/export 相关
    'import/no-unresolved': 'error',     // 未解析的导入
    'import/named': 'error',             // 确保命名导入存在
    'import/default': 'error',           // 确保默认导入存在
    'import/namespace': 'error',         // 确保命名空间导入存在
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.mjs']
      }
    }
  }
};