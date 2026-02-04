import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig } from 'vite'

function findHtmlInSecondLevel(root: string) {
  const result = []
  const input: { [key: string]: string } = {}

  // 遍历一级目录
  const firstLevel = fs.readdirSync(root, { withFileTypes: true })

  for (const dirent of firstLevel) {
    if (dirent.isDirectory()) {
      const secondDir = join(root, dirent.name)

      // 遍历二级目录
      const secondLevel = fs.readdirSync(secondDir, { withFileTypes: true })

      for (const file of secondLevel) {
        if (file.isFile() && file.name.endsWith('.html')) {
          input[dirent.name] = join(secondDir, file.name)
          result.push({
            name: dirent,
            path: file,
          })
        }
      }
    }
  }

  return input
}

export default defineConfig({
  server: {
    port: 4000,
    open: '/demos/lighthouse-test/index.html',
  },
  build: {
    rollupOptions: {
      input: {
        ...findHtmlInSecondLevel(resolve(__dirname, 'apps')),
        ...findHtmlInSecondLevel(resolve(__dirname, 'demos')),
      },
    },
  },
})
