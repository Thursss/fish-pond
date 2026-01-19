import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  react: true,
  typescript: true, // 启用 TypeScript 支持
  rules: {
    'vue/html-self-closing': ['off', {
      html: {
        void: 'never', // 空元素不使用自闭合
        normal: 'always', // 正常元素需要闭合标签
        component: 'always', // Vue组件需要闭合标签
      },
      svg: 'always',
      math: 'always',
    }],
    'ts/ban-ts-comment': 'off',
    // 其他规则
    'no-console': 'warn',
    'no-restricted-syntax': 'off',
  },
  // 忽略文件
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
  ],
})
