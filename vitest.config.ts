import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // LLM 评估每次调用 kimi 约 10-30 秒，6 个评估用例 + 网络波动
    testTimeout: 120000,
    hookTimeout: 30000,
    // 允许在测试中使用 import.meta.url
    pool: 'forks',
  },
});
