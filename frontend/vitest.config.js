import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://127.0.0.1:5173/',
      },
    },
    include: ['src/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
  },
})
