import * as fs from 'node:fs'
import { builtinModules } from 'node:module'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJsonPath = path.resolve(__dirname, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const entryPoints = {
  index: 'src/index.ts',
  performance: 'src/performance/index.ts',
  error: 'src/error/index.ts',
  behavior: 'src/behavior/index.ts',
}

const input = Object.fromEntries(
  Object.entries(entryPoints).flatMap(([name, relPath]) => {
    const absPath = path.resolve(__dirname, relPath)
    return fs.existsSync(absPath) ? [[name, absPath]] : []
  }),
)

const externalPackages = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...builtinModules,
  ...builtinModules.map(mod => `node:${mod}`),
])

function isExternal(id: string): boolean {
  if (externalPackages.has(id))
    return true

  for (const pkg of Array.from(externalPackages)) {
    if (id.startsWith(`${pkg}/`))
      return true
  }

  return false
}

const extensions = ['.mjs', '.js', '.json', '.ts']

const sharedPlugins = [
  nodeResolve({ extensions }),
  commonjs(),
  typescript({
    tsconfig: path.resolve(__dirname, '../../tsconfig.app.json'),
    tsconfigOverride: {
      compilerOptions: {
        noEmit: false,
        declaration: true,
        declarationMap: true,
        allowImportingTsExtensions: false,
        rootDir: path.resolve(__dirname, 'src'),
        outDir: path.resolve(__dirname, 'dist'),
      },
    },
  }),
]

const sharedOutput = {
  dir: path.resolve(__dirname, 'dist'),
  sourcemap: true,
  preserveModules: true,
  preserveModulesRoot: path.resolve(__dirname, 'src'),
}

export default defineConfig([
  {
    input,
    external: isExternal,
    plugins: sharedPlugins,
    output: [
      {
        ...sharedOutput,
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name]-[hash].js',
      },
      {
        ...sharedOutput,
        format: 'cjs',
        exports: 'named',
        entryFileNames: '[name].cjs',
        chunkFileNames: 'shared/[name]-[hash].cjs',
      },
    ],
  },
])
