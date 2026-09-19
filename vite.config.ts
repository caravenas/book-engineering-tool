/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    // Agent worktrees live in .claude/worktrees inside the repository, so
    // their copies of the suite would run alongside this one.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**', 'e2e/**'],
    cache: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
