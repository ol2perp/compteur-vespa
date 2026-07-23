import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/compteur-vespa/' : '/',
  build: { target: 'es2020' },
})
